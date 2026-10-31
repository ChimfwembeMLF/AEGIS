import { expect, test, type Page } from '@playwright/test';

const box = (page: Page) =>
  page.locator('#scene video').evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return { width: rect.width, height: rect.height, opacity: Number(style.opacity), transform: style.transform };
  });

const sceneSize = (page: Page) =>
  page.locator('#scene').evaluate((element) => ({ width: element.clientWidth, height: element.clientHeight }));

const layer = (page: Page, selector: string) =>
  page.locator(selector).evaluate((element) => Number(getComputedStyle(element).zIndex));

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Camera on')).toBeVisible({ timeout: 20000 });
});

test('the mirrored camera fills the scene, with points above it and the object in front', async ({ page }) => {
  const view = await box(page);
  const scene = await sceneSize(page);
  expect(view.width).toBe(scene.width);
  expect(view.height).toBe(scene.height);
  expect(view.transform).toMatch(/^matrix\(-1,/);
  expect(view.opacity).toBe(1);

  const video = await layer(page, '#scene video');
  const points = await layer(page, '#hand-overlay');
  const object = await layer(page, '#scene-canvas');
  expect(points).toBeGreaterThan(video);
  expect(object).toBeGreaterThan(points);
});

test('the scene is transparent, so the camera shows through around the object', async ({ page }) => {
  const clear = await page.evaluate(async () => {
    const canvas = document.querySelector('#scene-canvas') as HTMLCanvasElement;
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    const bitmap = await createImageBitmap(canvas);
    const copy = document.createElement('canvas');
    copy.width = bitmap.width;
    copy.height = bitmap.height;
    const context = copy.getContext('2d') as CanvasRenderingContext2D;
    context.drawImage(bitmap, 0, 0);
    return context.getImageData(2, 2, 1, 1).data[3];
  });
  expect(clear).toBe(0);
});

for (const method of ['key', 'button'] as const) {
  test(`the ${method} hides and shows the view while the camera stays on`, async ({ page }) => {
    const toggle = async () => {
      if (method === 'key') await page.keyboard.press('v');
      else await page.locator('#view-toggle').click();
    };

    await toggle();
    await expect.poll(async () => (await box(page)).width).toBeLessThanOrEqual(2);
    expect((await box(page)).opacity).toBeLessThanOrEqual(0.01);
    await expect(page.getByText('Camera on')).toBeVisible();
    await expect(page.locator('#capture-indicator')).toBeVisible();
    await expect(page.locator('#view-toggle')).toHaveText('Show camera view');

    await toggle();
    await expect.poll(async () => (await box(page)).opacity).toBe(1);
    await expect(page.locator('#view-toggle')).toHaveText('Hide camera view');
  });
}

test('stopping the camera clears the view', async ({ page }) => {
  await page.keyboard.press('c');
  await expect(page.getByText('Camera off. Press C to turn it on.')).toBeVisible();
  await expect.poll(async () => (await box(page)).width).toBeLessThanOrEqual(2);
  const source = await page.locator('#scene video').evaluate((element) => (element as HTMLVideoElement).srcObject);
  expect(source).toBeNull();
});

test('hand points draw, change colour on a pinch, and clear', async ({ page }) => {
  await page.goto('/tests/e2e/harness.html');
  await page.waitForFunction(() => 'aegisHarness' in window);
  const result = await page.evaluate(() => (window as any).aegisHarness.runOverlayCheck());
  expect(result.openPixels).toBeGreaterThan(100);
  expect(result.pinchPixels).toBeGreaterThan(100);
  expect(result.pinchColour).not.toEqual(result.openColour);
  expect(result.clearedPixels).toBe(0);
});
