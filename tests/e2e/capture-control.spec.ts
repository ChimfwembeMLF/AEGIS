import { expect, test, type Page } from '@playwright/test';

const STOP_LIMIT_MS = 500;

/** Keeps a reference to each camera track so the test can check that it really stopped. */
async function watchTracks(page: Page) {
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

/** Stops capture and returns how long the last camera track took to end. */
const timeToStop = (page: Page, stop: string) =>
  page.evaluate(
    ({ stop }) =>
      new Promise<number>((resolve) => {
        const tracks = (window as any).testTracks as MediaStreamTrack[];
        const track = tracks[tracks.length - 1] as MediaStreamTrack;
        const startedAt = performance.now();
        if (stop === 'button') (document.getElementById('camera-toggle') as HTMLElement).click();
        else window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c' }));
        const check = () => {
          if (track.readyState === 'ended') resolve(performance.now() - startedAt);
          else setTimeout(check, 5);
        };
        check();
      }),
    { stop },
  );

test.beforeEach(async ({ page }) => {
  await watchTracks(page);
  await page.goto('/');
  await expect(page.getByText('Camera on')).toBeVisible({ timeout: 20000 });
});

test('the indicator shows only while the camera is on', async ({ page }) => {
  const indicator = page.locator('#capture-indicator');
  await expect(indicator).toBeVisible();
  await page.keyboard.press('c');
  await expect(indicator).toBeHidden();
});

for (const method of ['button', 'key'] as const) {
  test(`stopping by ${method} ends the camera within the limit`, async ({ page }) => {
    expect(await timeToStop(page, method)).toBeLessThan(STOP_LIMIT_MS);
    await expect(page.getByText('Camera off. Press C to turn it on.')).toBeVisible();
    await expect(page.locator('#capture-indicator')).toBeHidden();
  });
}

test('stopping leaves the scene and keyboard working', async ({ page }) => {
  await page.keyboard.press('c');
  await expect(page.locator('#scene-canvas')).toBeVisible();
  await page.keyboard.down('ArrowUp');
  await expect
    .poll(async () => JSON.parse((await page.locator('#scene').getAttribute('data-pose')) as string).position.y)
    .toBeGreaterThan(0.2);
  await page.keyboard.up('ArrowUp');
});

test('capture restarts by button and by key, without a reload', async ({ page }) => {
  await page.evaluate(() => Object.assign(window, { samePage: true }));

  await page.keyboard.press('c');
  await expect(page.getByText('Camera off. Press C to turn it on.')).toBeVisible();
  await page.locator('#camera-toggle').click();
  await expect(page.getByText('Camera on')).toBeVisible();

  await page.keyboard.press('c');
  await expect(page.getByText('Camera off. Press C to turn it on.')).toBeVisible();
  await page.keyboard.press('c');
  await expect(page.getByText('Camera on')).toBeVisible();

  expect(await page.evaluate(() => (window as any).samePage)).toBe(true);
  const live = await page.evaluate(() =>
    ((window as any).testTracks as MediaStreamTrack[]).filter((track) => track.readyState === 'live').length,
  );
  expect(live).toBe(1);
});

test('the button names what it will do', async ({ page }) => {
  const toggle = page.locator('#camera-toggle');
  await expect(toggle).toHaveText('Stop camera');
  await page.keyboard.press('c');
  await expect(toggle).toHaveText('Start camera');
});
