const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const loadTypeScript = require('./helpers/load-typescript.cjs');

const RESPONSE = JSON.stringify({ problem_statement: 'Practice problem', constraints: [],
  example_input: 'input', example_output: 'output' });
const EVENTS = Object.fromEntries(['INITIAL_START', 'NO_SCREENSHOTS', 'API_KEY_INVALID',
  'INITIAL_SOLUTION_ERROR', 'SOLUTION_SUCCESS', 'PROBLEM_EXTRACTED', 'DEBUG_START',
  'DEBUG_SUCCESS', 'DEBUG_ERROR'].map(name => [name, name]));

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function setup(t, provider, view = 'queue', responses = []) {
  t.mock.method(console, 'log', () => {});
  t.mock.method(console, 'error', () => {});
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'processing-lifecycle-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const filename = path.join(dir, 'fixture.png');
  fs.writeFileSync(filename, 'synthetic screenshot');
  const calls = [];
  const events = [];
  const state = { view, problem: view === 'queue' ? null : { problem_statement: 'Existing problem' },
    debugged: false, clears: 0 };
  const request = options => {
    const index = calls.length;
    calls.push(options);
    // Deliberately ignore cancellation: guards must also handle a late response.
    return responses[index]?.promise || Promise.resolve(RESPONSE);
  };
  const config = new EventEmitter();
  config.loadConfig = () => ({ apiProvider: provider, apiKey: 'synthetic-key', language: 'python' });
  const screenshotHelper = {
    getScreenshotQueue: () => [filename],
    getExtraScreenshotQueue: () => [filename],
    getImagePreview: async () => 'preview',
    clearExtraScreenshotQueue: () => { state.clears++; },
  };
  const window = { isDestroyed: () => false,
    webContents: { send: (name, data) => events.push({ name, data }) } };
  const { ProcessingHelper } = loadTypeScript('electron/ProcessingHelper.ts', {
    electron: {},
    './ConfigHelper': { configHelper: config },
    openai: { OpenAI: class {
      chat = { completions: { create: async (_, options) => ({
        choices: [{ message: { content: await request(options) } }],
      }) } };
    } },
    '@anthropic-ai/sdk': class {
      messages = { create: async (_, options) => ({ content: [{ type: 'text', text: await request(options) }] }) };
    },
    axios: { __esModule: true, isCancel: error => error?.name === 'CanceledError',
      default: { post: async (_, __, options) => ({ data: {
        candidates: [{ content: { parts: [{ text: await request(options) }] } }],
      } }) } },
  });
  const helper = new ProcessingHelper({
    PROCESSING_EVENTS: EVENTS, getMainWindow: () => window,
    getScreenshotHelper: () => screenshotHelper,
    getView: () => state.view, setView: view => { state.view = view; },
    getProblemInfo: () => state.problem, setProblemInfo: problem => { state.problem = problem; },
    setHasDebugged: value => { state.debugged = value; },
  });
  return { helper, calls, events, state, screenshotHelper };
}

async function reachedRequest(calls, count = 1) {
  for (let i = 0; i < 20 && calls.length < count; i++) {
    await new Promise(resolve => setImmediate(resolve));
  }
  assert.ok(calls.length >= count, `expected request ${count}`);
}

for (const provider of ['openai', 'gemini', 'anthropic']) {
  for (const view of ['queue', 'solutions']) {
    test(`${provider}: reset suppresses late ${view} results and aborts the request`, async t => {
      const pending = deferred();
      const { helper, calls, events, state } = setup(t, provider, view, [pending]);
      const running = helper.processScreenshots();
      await reachedRequest(calls);
      helper.cancelOngoingRequests();
      state.view = 'queue';
      events.length = 0;
      pending.resolve(RESPONSE);
      await running;
      assert.deepEqual(events, [], 'a canceled task must not publish progress, errors, or results');
      assert.equal(state.problem, null);
      assert.equal(state.view, 'queue');
      assert.equal(state.debugged, false);
      assert.equal(state.clears, 0);
      assert.equal(calls.length, 1, 'canceled extraction must not start solution generation');
      assert.equal(calls[0]?.signal?.aborted, true);
    });
  }

  test(`${provider}: all stages receive a signal and a solution is published once`, async t => {
    const { helper, calls, events, state } = setup(t, provider);
    await helper.processScreenshots();
    assert.equal(state.view, 'solutions');
    assert.equal(events.filter(e => e.name === EVENTS.SOLUTION_SUCCESS).length, 1);
    await helper.processScreenshots();
    assert.equal(events.filter(e => e.name === EVENTS.DEBUG_SUCCESS).length, 1);
    assert.equal(calls.length, 3);
    assert.ok(calls.every(options => options?.signal instanceof AbortSignal));
  });

  test(`${provider}: reset during solution generation discards the late solution`, async t => {
    const pending = deferred();
    const { helper, calls, events, state } = setup(t, provider, 'queue', [null, pending]);
    const running = helper.processScreenshots();
    await reachedRequest(calls, 2);
    helper.cancelOngoingRequests();
    events.length = 0;
    pending.resolve(RESPONSE);
    await running;
    assert.deepEqual(events, []);
    assert.equal(state.problem, null);
    assert.equal(state.clears, 0);
    assert.equal(calls[1]?.signal?.aborted, true);
  });
}

for (const view of ['queue', 'solutions']) {
  test(`duplicate ${view} submissions are ignored until processing finishes`, async t => {
    const pending = deferred();
    const { helper, calls, events } = setup(t, 'openai', view, [pending]);
    const running = helper.processScreenshots();
    await reachedRequest(calls);
    const duplicate = helper.processScreenshots();
    // Let a broken duplicate reach the API without waiting for the first request.
    await new Promise(resolve => setImmediate(resolve));
    const countWhilePending = calls.length;
    pending.resolve(RESPONSE);
    await Promise.all([running, duplicate]);
    assert.equal(countWhilePending, 1);
    assert.equal(events.filter(e => e.name === (view === 'queue' ? EVENTS.INITIAL_START : EVENTS.DEBUG_START)).length, 1);
  });
}

test('an old task finishing cannot release the new task lock or publish an error', async t => {
  const old = deferred();
  const fresh = deferred();
  const { helper, calls, events, state } = setup(t, 'gemini', 'queue', [old, fresh]);
  const first = helper.processScreenshots();
  await reachedRequest(calls);
  helper.cancelOngoingRequests();
  const second = helper.processScreenshots();
  await reachedRequest(calls, 2);
  events.length = 0;
  old.reject(new Error('Late request failure'));
  await first;
  assert.deepEqual(events, []);
  const duplicate = helper.processScreenshots();
  await new Promise(resolve => setImmediate(resolve));
  const countWhilePending = calls.length;
  fresh.resolve(RESPONSE);
  await Promise.all([second, duplicate]);
  assert.equal(countWhilePending, 2);
  assert.equal(state.view, 'solutions');
  assert.equal(events.filter(e => e.name === EVENTS.SOLUTION_SUCCESS).length, 1);
});

test('reset during screenshot loading does not start an API request', async t => {
  const pending = deferred();
  const { helper, calls, events, screenshotHelper } = setup(t, 'openai');
  screenshotHelper.getImagePreview = () => pending.promise;
  const running = helper.processScreenshots();
  helper.cancelOngoingRequests();
  events.length = 0;
  pending.resolve('preview');
  await running;
  assert.equal(calls.length, 0);
  assert.deepEqual(events, []);
});
