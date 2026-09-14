const test = require('node:test');
const assert = require('node:assert/strict');
const { findNewDiagnostics } = require('../tooling/diagnostic-baseline.cjs');
const known = ['typescript', 'src/example.ts', '2322', 'Type mismatch'];

test('known debt is allowed and fixing it does not fail the gate', () => {
  assert.deepEqual(findNewDiagnostics([known], [known]), []);
  assert.deepEqual(findNewDiagnostics([], [known]), []);
});

test('new files, messages and additional occurrences fail the gate', () => {
  const otherFile = ['typescript', 'src/other.ts', '2322', 'Type mismatch'];
  const otherMessage = ['typescript', 'src/example.ts', '2322', 'Different mismatch'];
  assert.deepEqual(findNewDiagnostics([known, known, otherFile, otherMessage], [known]),
    [known, otherFile, otherMessage]);
});
