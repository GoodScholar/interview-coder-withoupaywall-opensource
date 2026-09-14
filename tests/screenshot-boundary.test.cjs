const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const loadTypeScript = require('./helpers/load-typescript.cjs');

let nextScreenshotId = 0;

function createHelper(root, view = 'queue') {
  const { ScreenshotHelper } = loadTypeScript('electron/ScreenshotHelper.ts', {
    electron: {
      app: {
        getPath(name) {
          return path.join(root, name);
        },
      },
    },
    'screenshot-desktop': async () => Buffer.from('captured image'),
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

test('rejects unqueued and traversal paths without deleting their files', async () => {
  await withTemporaryRoot(async root => {
    const helper = createHelper(root);
    const managedPath = await capture(helper);
    const unqueuedPath = path.join(path.dirname(managedPath), 'unqueued.png');
    const externalPath = path.join(root, 'external.png');
    fs.writeFileSync(unqueuedPath, 'unqueued image');
    fs.writeFileSync(externalPath, 'external image');

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
