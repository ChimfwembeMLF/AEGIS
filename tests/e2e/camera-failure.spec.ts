import { expect, test, type Page } from '@playwright/test';

const pose = async (page: Page) =>
  JSON.parse((await page.locator('#scene').getAttribute('data-pose')) as string);

test('losing the camera during a session keeps the keyboard working', async ({ page }) => {
  await page.addInitScript(() => {
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      const stream = await original(constraints);
      Object.assign(window, { testStream: stream });
      return stream;
    };
  });
  await page.goto('/');
  await expect(page.getByText('Camera on')).toBeVisible({ timeout: 20000 });

  await page.evaluate(() => {
    const track = (window as any).testStream.getVideoTracks()[0];
    track.stop();
    track.dispatchEvent(new Event('ended'));
  });

  await expect(page.getByText('Camera disconnected. You can continue with the keyboard.')).toBeVisible();

  await page.keyboard.down('ArrowLeft');
  await expect.poll(async () => (await pose(page)).position.x).toBeLessThan(-0.2);
  await page.keyboard.up('ArrowLeft');
});

test('a missing tracking model explains itself and leaves the keyboard working', async ({ page }) => {
  await page.route('**/hand_landmarker.task', (route) => route.fulfill({ status: 404, body: '' }));
  await page.goto('/');
  await expect(page.getByText('Hand tracking could not start. You can use the keyboard.')).toBeVisible({
    timeout: 20000,
  });
  await page.keyboard.down('ArrowLeft');
  await expect.poll(async () => (await pose(page)).position.x).toBeLessThan(-0.2);
  await page.keyboard.up('ArrowLeft');
});
