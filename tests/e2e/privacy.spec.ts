import { expect, test } from '@playwright/test';

test('a full session sends nothing away and leaves nothing behind', async ({ page, baseURL }) => {
  const external: string[] = [];
  const consoleOutput: string[] = [];
  page.on('request', (request) => {
    const url = request.url();
    if (!url.startsWith(baseURL as string) && !/^(blob|data):/.test(url)) external.push(url);
  });
  page.on('console', (message) => consoleOutput.push(message.text()));

  await page.goto('/');
  await expect(page.getByText('Camera on')).toBeVisible({ timeout: 20000 });

  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(1500);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.press('c');
  await expect(page.getByText('Camera off. Press C to turn it on.')).toBeVisible();

  const stored = await page.evaluate(async () => {
    const directory = await navigator.storage.getDirectory();
    const opfsEntries: string[] = [];
    for await (const key of (directory as any).keys()) opfsEntries.push(key);
    return {
      localStorage: localStorage.length,
      sessionStorage: sessionStorage.length,
      indexedDb: (await indexedDB.databases()).length,
      cacheStorage: (await caches.keys()).length,
      opfsEntries,
    };
  });

  expect(external).toEqual([]);
  expect(stored).toEqual({
    localStorage: 0,
    sessionStorage: 0,
    indexedDb: 0,
    cacheStorage: 0,
    opfsEntries: [],
  });
  expect(consoleOutput.filter((line) => /data:image|base64/i.test(line) || line.length > 2000)).toEqual([]);
});

test('the browser itself blocks requests to other hosts', async ({ page }) => {
  await page.goto('/');
  const outcome = await page.evaluate(() =>
    fetch('https://example.com/upload', { method: 'POST', body: 'x' }).then(
      () => 'sent',
      () => 'blocked',
    ),
  );
  expect(outcome).toBe('blocked');
});

test('the camera view is only ever drawn to this page', async ({ page }) => {
  // Every browser route for turning live video into a saved or sent image is watched.
  await page.addInitScript(() => {
    const uses: string[] = [];
    Object.assign(window, { imageExports: uses });
    const watch = (owner: any, name: string, label: string) => {
      const original = owner[name];
      owner[name] = function (...args: unknown[]) {
        uses.push(label);
        return original.apply(this, args);
      };
    };
    watch(HTMLCanvasElement.prototype, 'toDataURL', 'toDataURL');
    watch(HTMLCanvasElement.prototype, 'toBlob', 'toBlob');
    watch(HTMLCanvasElement.prototype, 'captureStream', 'captureStream');
    watch(HTMLMediaElement.prototype, 'captureStream', 'video captureStream');
    const Recorder = window.MediaRecorder;
    window.MediaRecorder = class extends Recorder {
      constructor(...args: ConstructorParameters<typeof MediaRecorder>) {
        super(...args);
        uses.push('MediaRecorder');
      }
    };
  });

  await page.goto('/');
  await expect(page.getByText('Camera on')).toBeVisible({ timeout: 20000 });
  await page.waitForTimeout(1500);
  await page.keyboard.press('v');
  await page.keyboard.press('c');
  await expect(page.getByText('Camera off. Press C to turn it on.')).toBeVisible();

  expect(await page.evaluate(() => (window as any).imageExports)).toEqual([]);
});

test('there is exactly one camera element, read directly from the camera', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Camera on')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('video')).toHaveCount(1);
  const source = await page.locator('video').evaluate((element) => {
    const video = element as HTMLVideoElement;
    return { live: video.srcObject instanceof MediaStream, file: video.currentSrc, controls: video.controls };
  });
  expect(source).toEqual({ live: true, file: '', controls: false });
});
