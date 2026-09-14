const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const loadTypeScript = require('./helpers/load-typescript.cjs');

test('debug subscriptions stop delivering events after cleanup without removing other subscribers', () => {
  const ipcRenderer = new EventEmitter();
  let api;
  loadTypeScript('electron/preload.ts', {
    electron: { ipcRenderer, contextBridge: { exposeInMainWorld: (_, value) => { api = value; } } },
  });
  let activeCalls = 0;
  const stopActive = api.onDebugSuccess(() => { activeCalls++; });
  for (let i = 0; i < 3; i++) {
    let calls = 0;
    const stop = api.onDebugSuccess(() => { calls++; });
    ipcRenderer.emit('debug-success', {}, { code: 'example' });
    assert.equal(calls, 1);
    stop();
    ipcRenderer.emit('debug-success', {}, { code: 'next' });
    assert.equal(calls, 1, 'unsubscribed callbacks must not receive later results');
  }
  assert.equal(activeCalls, 6);
  stopActive();
  ipcRenderer.emit('debug-success', {}, {});
  assert.equal(activeCalls, 6);
  assert.equal(ipcRenderer.listenerCount('debug-success'), 0);
});
