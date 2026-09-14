// Counts are scoped to tool, file, diagnostic code, and message. Line numbers
// are deliberately omitted so unrelated edits do not invalidate the baseline.
function countDiagnostics(diagnostics) {
  const counts = new Map();
  for (const diagnostic of diagnostics) {
    const key = JSON.stringify(diagnostic);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

function findNewDiagnostics(current, baseline) {
  const allowed = countDiagnostics(baseline);
  return current.filter(diagnostic => {
    const key = JSON.stringify(diagnostic);
    const remaining = allowed.get(key) || 0;
    if (remaining === 0) return true;
    allowed.set(key, remaining - 1);
    return false;
  });
}

module.exports = { findNewDiagnostics };
