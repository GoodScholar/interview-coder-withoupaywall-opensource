const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTypeScript = require('./helpers/load-typescript.cjs');

for (const [provider, expected] of [['openai', 'gpt-4o'], ['anthropic', 'claude-3-7-sonnet-20250219']]) {
  test(`legacy ${provider} configurations receive provider-compatible missing models`, t => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'model-defaults-'));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify({ apiProvider: provider }));
    const { configHelper } = loadTypeScript('electron/ConfigHelper.ts', {
      electron: { app: { getPath: () => dir } },
    });
    const config = configHelper.loadConfig();
    assert.equal(config.extractionModel, expected);
    assert.equal(config.solutionModel, expected);
    assert.equal(config.debuggingModel, expected);
  });
}

test('every model offered to the renderer survives configuration validation and reload', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'model-catalog-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const { MODEL_PROVIDERS } = loadTypeScript('electron/modelConfig.ts');
  const { configHelper } = loadTypeScript('electron/ConfigHelper.ts', {
    electron: { app: { getPath: () => dir } },
  });
  for (const [apiProvider, { models }] of Object.entries(MODEL_PROVIDERS)) {
    for (const { id } of models) {
      configHelper.updateConfig({ apiProvider, extractionModel: id, solutionModel: id, debuggingModel: id });
      const saved = configHelper.loadConfig();
      assert.equal(saved.extractionModel, id);
      assert.equal(saved.solutionModel, id);
      assert.equal(saved.debuggingModel, id);
    }
  }
});
