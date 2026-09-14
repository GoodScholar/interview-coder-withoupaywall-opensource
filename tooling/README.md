# Quality checks

`npm test` discovers real Node.js regression tests (`*.test.cjs`). Tests load
production TypeScript with the existing TypeScript dependency and replace only
unavailable desktop/runtime dependencies. No API key is required.

CI installs the lockfile with `npm ci` and blocks on:

- `npm run check:quality`: no new ESLint or strict TypeScript diagnostics.
- `npm run typecheck:electron`: the Electron project's full type check.
- `npm run build`: the production build.
- `npm test`: regression tests, including tests from other PRs once merged.

The repository has existing lint and strict type errors. `quality-baseline.json`
records them explicitly instead of hiding failures with `continue-on-error`.
A green baseline check means **no new diagnostics**, not a clean full lint or
strict type check. CI prints the outstanding count in its job summary. The raw
`npm run lint` and `npx tsc --noEmit` commands still report existing failures.
ESLint checks JavaScript and TypeScript source; generated output is excluded.
The previous JSON/Markdown/CSS rules were applied without matching language
parsers; this gate does not claim to validate those formats.

The baseline matches tool, repository-relative file, diagnostic code/message,
and occurrence count. Line numbers are excluded so moving existing code does
not fail the gate. A different diagnostic, file, or increased count fails. An
identical diagnostic replacing another within the same file is not distinguished.
Fatal ESLint parse errors and invalid TypeScript configuration fail outright.

After fixing existing issues, regenerate the baseline with
`node tooling/check-quality.cjs --write-baseline` and review the diff: entries
should be removed. Never regenerate the baseline in CI or add new entries merely
to make a failing PR green. The baseline is a transitional measure; remove it
when the remaining diagnostics are fixed.
