const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTypeScript = require('./helpers/load-typescript.cjs');

function setup(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'config-save-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const { configHelper } = loadTypeScript('electron/ConfigHelper.ts', {
    electron: { app: { getPath: () => dir } },
  });
  const handlers = new Map();
  const { initializeIpcHandlers } = loadTypeScript('electron/ipcHandlers.ts', {
    electron: { ipcMain: { handle: (name, handler) => handlers.set(name, handler) } },
    './ConfigHelper': { configHelper },
  });
  initializeIpcHandlers({});
  return { dir, configHelper, update: updates => handlers.get('update-config')({}, updates) };
}

test('IPC rejects failed persistence and does not publish a configuration change', t => {
  const { dir, configHelper, update } = setup(t);
  t.mock.method(console, 'error', () => {});
  // A directory at the file path causes a real write failure on every platform.
  const filename = path.join(dir, 'config.json');
  fs.unlinkSync(filename);
  fs.mkdirSync(filename);
  const changes = [];
  configHelper.on('config-updated', value => changes.push(value));
  assert.throws(() => update({ language: 'javascript' }));
  assert.equal(changes.length, 0);
});

test('successful IPC updates persist and notify consumers', t => {
  const { configHelper, update } = setup(t);
  const changes = [];
  configHelper.on('config-updated', value => changes.push(value));
  assert.equal(update({ language: 'javascript' }).language, 'javascript');
  assert.equal(configHelper.loadConfig().language, 'javascript');
  assert.equal(changes.length, 1);
});
