const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const loadTypeScript = require('./helpers/load-typescript.cjs');

let nextScreenshotId = 0;

function createHelper(root, view = 'queue', runtime = {}) {
  runtime.shellCalls ??= [];
  const { ScreenshotHelper } = loadTypeScript('electron/ScreenshotHelper.ts', {
    electron: {
      app: {
        getPath(name) {
          return path.join(root, name);
        },
      },
    },
    'screenshot-desktop': async options => {
      if (options?.filename) {
        await fs.promises.writeFile(options.filename, 'captured image');
        return;
      }
      return Buffer.from('captured image');
    },
    child_process: {
      execFile(command, _args, callback) {
        runtime.shellCalls.push(command);
        callback(new Error('Shell capture must not run in tests'));
      },
    },
    uuid: { v4: () => `captured-${++nextScreenshotId}` },
  });

  return new ScreenshotHelper(view);
}

async function capture(helper) {
  return helper.takeScreenshot(() => {}, () => {});
}

function withTemporaryRoot(run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'interview-screenshot-test-'));
  return Promise.resolve(run(root)).finally(() => fs.rmSync(root, { recursive: true, force: true }));
}

async function withPlatform(platform, run) {
  const descriptor = Object.getOwnPropertyDescriptor(process, 'platform');
  Object.defineProperty(process, 'platform', { ...descriptor, value: platform });
  try {
    return await run();
  } finally {
    Object.defineProperty(process, 'platform', descriptor);
  }
}

test('previews and deletes captured screenshots from both managed queues', async () => {
  await withTemporaryRoot(async root => {
    const mainHelper = createHelper(root);
    const mainPath = await capture(mainHelper);
    const mainPreview = await mainHelper.getImagePreview(mainPath);

    assert.equal(mainPreview, 'data:image/png;base64,Y2FwdHVyZWQgaW1hZ2U=');
    assert.deepEqual(await mainHelper.deleteScreenshot(mainPath), { success: true });
    assert.equal(fs.existsSync(mainPath), false);
    assert.equal(await mainHelper.getImagePreview(mainPath), '');
    assert.deepEqual(mainHelper.getScreenshotQueue(), []);

    const extraHelper = createHelper(root, 'solutions');
    const extraPath = await capture(extraHelper);
    const extraPreview = await extraHelper.getImagePreview(extraPath);

    assert.equal(extraPreview, 'data:image/png;base64,Y2FwdHVyZWQgaW1hZ2U=');
    assert.deepEqual(await extraHelper.deleteScreenshot(extraPath), { success: true });
    assert.equal(fs.existsSync(extraPath), false);
    assert.equal(await extraHelper.getImagePreview(extraPath), '');
    assert.deepEqual(extraHelper.getExtraScreenshotQueue(), []);
  });
});

test('deletes a main screenshot after the active view changes', async () => {
  await withTemporaryRoot(async root => {
    const helper = createHelper(root);
    const mainPath = await capture(helper);
    helper.setView('solutions');

    assert.deepEqual(await helper.deleteScreenshot(mainPath), { success: true });
    assert.deepEqual(helper.getScreenshotQueue(), []);
  });
});

test('rejects unqueued and traversal paths without deleting their files', async () => {
  await withTemporaryRoot(async root => {
    const helper = createHelper(root);
    const managedPath = await capture(helper);
    const unqueuedPath = path.join(path.dirname(managedPath), 'unqueued.png');
    const externalPath = path.join(path.dirname(path.dirname(managedPath)), 'external.png');
    const outsidePath = path.join(root, 'outside.png');
    fs.writeFileSync(unqueuedPath, 'unqueued image');
    fs.writeFileSync(externalPath, 'external image');
    fs.writeFileSync(outsidePath, 'outside image');

    assert.equal(await helper.getImagePreview(unqueuedPath), '');
    assert.deepEqual(await helper.deleteScreenshot(unqueuedPath), {
      success: false,
      error: 'Screenshot is not managed',
    });
    assert.equal(fs.readFileSync(unqueuedPath, 'utf8'), 'unqueued image');

    const traversalPath = `${path.dirname(managedPath)}/../external.png`;
    assert.equal(await helper.getImagePreview(traversalPath), '');
    assert.deepEqual(await helper.deleteScreenshot(traversalPath), {
      success: false,
      error: 'Screenshot is not managed',
    });
    assert.equal(fs.readFileSync(externalPath, 'utf8'), 'external image');

    assert.equal(await helper.getImagePreview(outsidePath), '');
    assert.deepEqual(await helper.deleteScreenshot(outsidePath), {
      success: false,
      error: 'Screenshot is not managed',
    });
    assert.equal(fs.readFileSync(outsidePath, 'utf8'), 'outside image');

    assert.equal(await helper.getImagePreview(null), '');
    assert.deepEqual(await helper.deleteScreenshot(null), {
      success: false,
      error: 'Screenshot is not managed',
    });
  });
});

test('rejects a queued screenshot replaced with a symlink', async () => {
  await withTemporaryRoot(async root => {
    const helper = createHelper(root);
    const managedPath = await capture(helper);
    const externalPath = path.join(root, 'external.png');
    fs.writeFileSync(externalPath, 'external image');
    fs.unlinkSync(managedPath);
    fs.symlinkSync(externalPath, managedPath);

    assert.equal(await helper.getImagePreview(managedPath), '');
    assert.deepEqual(await helper.deleteScreenshot(managedPath), {
      success: false,
      error: 'Screenshot is not managed',
    });
    assert.equal(fs.readFileSync(externalPath, 'utf8'), 'external image');
    assert.equal(fs.lstatSync(managedPath).isSymbolicLink(), true);
  });
});

test('rejects a queued screenshot when its parent directory becomes a symlink', async t => {
  await withTemporaryRoot(async root => {
    const helper = createHelper(root);
    const managedPath = await capture(helper);
    const screenshotDirectory = path.dirname(managedPath);
    const savedDirectory = `${screenshotDirectory}-saved`;
    const outsideDirectory = path.join(root, 'outside');
    const externalPath = path.join(outsideDirectory, path.basename(managedPath));
    fs.renameSync(screenshotDirectory, savedDirectory);
    fs.mkdirSync(outsideDirectory);
    fs.writeFileSync(externalPath, 'external secret');
    try {
      fs.symlinkSync(outsideDirectory, screenshotDirectory, 'dir');
    } catch (error) {
      if (error.code === 'EPERM' || error.code === 'ENOTSUP') {
        t.skip(`directory symlinks are unavailable: ${error.code}`);
        return;
      }
      throw error;
    }

    assert.equal(await helper.getImagePreview(managedPath), '');
    assert.deepEqual(await helper.deleteScreenshot(managedPath), {
      success: false,
      error: 'Screenshot is not managed',
    });
    assert.equal(fs.readFileSync(externalPath, 'utf8'), 'external secret');
    assert.equal(fs.lstatSync(screenshotDirectory).isSymbolicLink(), true);
  });
});

test('removes a missing managed screenshot from its queue', async () => {
  await withTemporaryRoot(async root => {
    const helper = createHelper(root);
    const managedPath = await capture(helper);
    fs.unlinkSync(managedPath);

    assert.deepEqual(await helper.deleteScreenshot(managedPath), { success: true });
    assert.deepEqual(helper.getScreenshotQueue(), []);
    assert.equal(await helper.getImagePreview(managedPath), '');
  });
});

test('Windows capture mock writes the requested file without shell fallback', async () => {
  await withTemporaryRoot(async root => {
    const runtime = {};
    const helper = createHelper(root, 'queue', runtime);

    await withPlatform('win32', async () => {
      const managedPath = await capture(helper);
      assert.equal(await helper.getImagePreview(managedPath), 'data:image/png;base64,Y2FwdHVyZWQgaW1hZ2U=');
    });

    assert.deepEqual(runtime.shellCalls, []);
  });
});
