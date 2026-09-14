const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTypeScript = require('./helpers/load-typescript.cjs');

function setup(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'provider-detection-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return loadTypeScript('electron/ConfigHelper.ts', {
    electron: { app: { getPath: () => dir } },
  }).configHelper;
}

for (const [key, provider] of [
  ['  sk-ant-' + 'x'.repeat(40) + '  ', 'anthropic'],
  ['sk-' + 'x'.repeat(40), 'openai'],
  ['synthetic-gemini-key', 'gemini'],
]) {
  test(`saving a key without a provider selects ${provider}`, t => {
    const config = setup(t);
    config.updateConfig({ apiKey: key });
    assert.equal(config.loadConfig().apiProvider, provider);
  });
}

test('an explicit provider takes precedence over key prefix inference', t => {
  const config = setup(t);
  config.updateConfig({ apiKey: 'sk-ant-synthetic', apiProvider: 'gemini' });
  assert.equal(config.loadConfig().apiProvider, 'gemini');
});
