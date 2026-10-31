import { expect, test } from '@playwright/test';

test('the live source meets the HandFrameSource contract', async ({ page }) => {
  await page.goto('/tests/e2e/harness.html');
  await page.waitForFunction(() => 'aegisHarness' in window);

  const result = await page.evaluate(() => (window as any).aegisHarness.runLiveSourceCheck());

  expect(result.frames).toBeGreaterThanOrEqual(5);
  expect(result.timestampsIncrease).toBe(true);
  expect(result.imageFields).toEqual([]);
  expect(result.framesAfterStop).toBe(0);
  expect(result.cameraReleased).toBe(true);
});
