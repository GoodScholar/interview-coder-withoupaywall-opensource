const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { findNewDiagnostics } = require('./diagnostic-baseline.cjs');

async function main() {
  const root = path.resolve(__dirname, '..');
  process.chdir(root);
  const relative = filename => path.relative(root, filename).split(path.sep).join('/');
  // ESLint 8 exposes the flat-config API under FlatESLint.
  const { FlatESLint } = require('eslint/use-at-your-own-risk');
  const lint = await new FlatESLint().lintFiles(['**/*.{js,mjs,cjs,ts,tsx}']);
  if (lint.some(file => file.fatalErrorCount)) throw new Error('ESLint reported a fatal parsing error');
  const diagnostics = lint.flatMap(file => file.messages.filter(message => message.severity === 2)
    .map(message => ['eslint', relative(file.filePath), message.ruleId, message.message]));
  const config = ts.readConfigFile('tsconfig.json', ts.sys.readFile);
  if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  if (parsed.errors.length) throw new Error('Invalid TypeScript configuration');
  const program = ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options,
    projectReferences: parsed.projectReferences });
  const errors = ts.getPreEmitDiagnostics(program).filter(d => d.category === ts.DiagnosticCategory.Error);
  for (const d of errors) {
    diagnostics.push(['typescript', d.file ? relative(d.file.fileName) : '<configuration>',
      String(d.code), ts.flattenDiagnosticMessageText(d.messageText, '\n')]);
  }
  diagnostics.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b), 'en'));
  const filename = path.join(__dirname, 'quality-baseline.json');
  if (process.argv.includes('--write-baseline')) {
    fs.writeFileSync(filename, '[\n' + diagnostics.map(d => '  ' + JSON.stringify(d)).join(',\n') + '\n]\n');
    console.log(`Recorded ${diagnostics.length} existing diagnostics. Review this diff before committing.`);
    return;
  }
  const added = findNewDiagnostics(diagnostics, JSON.parse(fs.readFileSync(filename, 'utf8')));
  for (const diagnostic of added) console.error(diagnostic.join(': '));
  const summary = `Quality baseline: ${diagnostics.length} current diagnostics, ${added.length} new. This is a no-new-diagnostics gate, not a claim that legacy lint/type errors are resolved.`;
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + '\n');
  if (added.length) process.exitCode = 1;
}

main().catch(error => { console.error(error); process.exitCode = 1; });
