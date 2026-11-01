import { expect, test, type Page } from '@playwright/test';

const CAMERA_OFF = 'Camera off. Press C to turn it on.';

/** Records every camera track, and slows the model so tests can act while tracking loads. */
async function prepare(page: Page) {
  await page.route('**/hand_landmarker.task', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.continue();
  });
  await page.addInitScript(() => {
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    const tracks: MediaStreamTrack[] = [];
    Object.assign(window, { testTracks: tracks });
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      const stream = await original(constraints);
      tracks.push(...stream.getTracks());
      return stream;
    };
  });
}

const liveTracks = (page: Page) =>
  page.evaluate(
    () => ((window as any).testTracks as MediaStreamTrack[]).filter((track) => track.readyState === 'live').length,
  );

test.beforeEach(async ({ page }) => {
  await prepare(page);
  await page.goto('/');
});

test('the person sees that the camera is starting while tracking loads', async ({ page }) => {
  // Short limits: these must already be true while tracking loads, not become true later.
  await expect(page.locator('#camera-status')).toHaveText('Starting camera. If your browser asks, choose Allow.', {
    timeout: 500,
  });
  await expect(page.locator('#camera-toggle')).toHaveText('Stop camera', { timeout: 500 });
  await expect(page.locator('#camera-toggle')).toBeEnabled({ timeout: 500 });
});

test('stopping while tracking loads leaves no camera running', async ({ page }) => {
  await page.keyboard.press('c');
  await expect(page.getByText(CAMERA_OFF)).toBeVisible();
  await page.waitForTimeout(2500);
  await expect(page.getByText(CAMERA_OFF)).toBeVisible();
  expect(await liveTracks(page)).toBe(0);
});

test('stopping and restarting quickly gives exactly one camera, which Stop ends', async ({ page }) => {
  await page.keyboard.press('c');
  await page.keyboard.press('c');
  await expect(page.getByText('Camera on')).toBeVisible({ timeout: 20000 });
  expect(await liveTracks(page)).toBe(1);

  await page.keyboard.press('c');
  await expect(page.getByText(CAMERA_OFF)).toBeVisible();
  expect(await liveTracks(page)).toBe(0);
});

test('the indicator shows as soon as a camera stream exists', async ({ page }) => {
  await page.addInitScript(() => {
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = async function () {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return play.call(this);
    };
  });
  await page.reload();
  await expect.poll(() => liveTracks(page), { timeout: 20000 }).toBe(1);
  await expect(page.locator('#capture-indicator')).toBeVisible({ timeout: 500 });
});
