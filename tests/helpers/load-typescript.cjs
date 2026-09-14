const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const ts = require('typescript');

// Load the real module while replacing only desktop/runtime dependencies.
module.exports = function loadTypeScript(relativePath, mocks = {}) {
  const filename = path.resolve(__dirname, '../..', relativePath);
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
    fileName: filename,
  });
  const localRequire = createRequire(filename);
  const module = { exports: {} };
  const run = vm.runInThisContext(
    `(function(require, module, exports) { ${outputText}\n})`, { filename },
  );
  run(name => Object.hasOwn(mocks, name) ? mocks[name] : localRequire(name), module, module.exports);
  return module.exports;
};
