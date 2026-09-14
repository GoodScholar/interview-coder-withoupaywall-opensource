const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function runLauncher(t, buildExit) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'launch-script-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const windows = process.platform === 'win32';
  const name = windows ? 'stealth-run.bat' : 'stealth-run.sh';
  fs.copyFileSync(path.join(__dirname, '..', name), path.join(dir, name));
  fs.writeFileSync(path.join(dir, '.env'), 'TEST_VALUE=preserve-me\n');
  const bin = path.join(dir, 'bin');
  fs.mkdirSync(bin);
  const npm = windows
    ? '@echo off\r\nif "%2"=="build" exit /b %TEST_BUILD_EXIT%\r\necho launched> "%TEST_LAUNCH_MARKER%"\r\nexit /b 0\r\n'
    : '#!/bin/sh\nif [ "$2" = build ]; then exit "$TEST_BUILD_EXIT"; fi\nprintf launched > "$TEST_LAUNCH_MARKER"\n';
  const npx = windows ? '@echo off\r\necho launched> "%TEST_LAUNCH_MARKER%"\r\n' : '#!/bin/sh\nprintf launched > "$TEST_LAUNCH_MARKER"\n';
  fs.writeFileSync(path.join(bin, windows ? 'npm.cmd' : 'npm'), npm, { mode: 0o755 });
  fs.writeFileSync(path.join(bin, windows ? 'npx.cmd' : 'npx'), npx, { mode: 0o755 });
  // The old shell launcher creates macOS directories; keep the test isolated.
  if (!windows) fs.writeFileSync(path.join(bin, 'mkdir'), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
  const marker = path.join(dir, 'launched');
  const env = { ...process.env, TEST_BUILD_EXIT: String(buildExit), TEST_LAUNCH_MARKER: marker, APPDATA: dir };
  const pathKey = Object.keys(env).find(key => key.toLowerCase() === 'path') || 'PATH';
  env[pathKey] = bin + path.delimiter + env[pathKey];
  const result = spawnSync(windows ? 'cmd.exe' : 'bash',
    windows ? ['/d', '/c', name] : [name], { cwd: dir, env, encoding: 'utf8', timeout: 10000 });
  assert.ifError(result.error);
  return { dir, marker, result };
}

test('successful launch preserves the local environment file', t => {
  const { dir, marker, result } = runLauncher(t, 0);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(path.join(dir, '.env')), true, '.env must not be deleted');
  assert.equal(fs.readFileSync(path.join(dir, '.env'), 'utf8'), 'TEST_VALUE=preserve-me\n');
  assert.equal(fs.existsSync(marker), true);
});

test('build failure exits unsuccessfully without launching Electron', t => {
  const { marker, result } = runLauncher(t, 7);
  assert.equal(result.status, 7, 'the launcher must propagate the failed build status');
  assert.equal(fs.existsSync(marker), false, 'Electron must not launch after a failed build');
});
