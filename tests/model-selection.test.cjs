const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTypeScript = require('./helpers/load-typescript.cjs');

function setup(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'model-selection-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return loadTypeScript('electron/ConfigHelper.ts', {
    electron: { app: { getPath: () => dir } },
  }).configHelper;
}

test('switching provider preserves explicit models after reloading from disk', t => {
  const config = setup(t);
  config.updateConfig({ apiProvider: 'openai', extractionModel: 'gpt-4o-mini',
    solutionModel: 'gpt-4o-mini', debuggingModel: 'gpt-4o' });
  const saved = config.loadConfig();
  assert.equal(saved.extractionModel, 'gpt-4o-mini');
  assert.equal(saved.solutionModel, 'gpt-4o-mini');
  assert.equal(saved.debuggingModel, 'gpt-4o');
});

test('switching provider supplies defaults for omitted or incompatible models', t => {
  const config = setup(t);
  config.updateConfig({ apiProvider: 'openai', extractionModel: 'gemini-2.0-flash' });
  const saved = config.loadConfig();
  assert.equal(saved.extractionModel, 'gpt-4o');
  assert.equal(saved.solutionModel, 'gpt-4o');
  assert.equal(saved.debuggingModel, 'gpt-4o');
});

test('updating other settings preserves models for the current provider', t => {
  const config = setup(t);
  config.updateConfig({ solutionModel: 'gemini-1.5-pro' });
  config.updateConfig({ opacity: 0.5 });
  assert.equal(config.loadConfig().solutionModel, 'gemini-1.5-pro');
});
