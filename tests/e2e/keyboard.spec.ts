import { expect, test, type Page } from '@playwright/test';

const pose = async (page: Page) =>
  JSON.parse((await page.locator('#scene').getAttribute('data-pose')) as string);

test('all object keys work with camera access denied', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Camera access is off.')).toBeVisible();

  await page.keyboard.down('ArrowRight');
  await expect.poll(async () => (await pose(page)).position.x).toBeGreaterThan(0.2);
  await page.keyboard.up('ArrowRight');

  await page.keyboard.down('ArrowUp');
  await expect.poll(async () => (await pose(page)).position.y).toBeGreaterThan(0.2);
  await page.keyboard.up('ArrowUp');

  await page.keyboard.down('q');
  await expect.poll(async () => (await pose(page)).rotation).toBeGreaterThan(0.2);
  await page.keyboard.up('q');

  await page.keyboard.press('r');
  await expect.poll(() => pose(page)).toEqual({ position: { x: 0, y: 0 }, rotation: 0 });
});

test('each press of the button visibly responds while camera access is refused', async ({ page }) => {
  await page.goto('/');
  const toggle = page.locator('#camera-toggle');
  const status = page.locator('#camera-status');
  await expect(toggle).toHaveText('Try camera again', { timeout: 20000 });
  await expect(status).toContainText('Press Try camera again and choose Allow.');

  await toggle.click();
  await expect(status).toContainText('Try 2 failed.');
  await toggle.click();
  await expect(status).toContainText('Try 3 failed.');
  await expect(toggle).toHaveText('Try camera again');
});

test('a device with no camera opens the scene and explains why', async ({ page }) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () =>
      Promise.reject(new DOMException('No camera', 'NotFoundError'));
  });
  await page.goto('/');
  await expect(page.locator('#scene-canvas')).toBeVisible();
  await expect(
    page.getByText('No camera found. If this device has one, quit Chrome fully and reopen it, or use the keyboard.'),
  ).toBeVisible();
});

test('a camera in use by another app is explained', async ({ page }) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () =>
      Promise.reject(new DOMException('In use', 'NotReadableError'));
  });
  await page.goto('/');
  await expect(page.getByText('Your camera is being used by another app. You can use the keyboard.')).toBeVisible();
});

test('shrinking the window keeps the object in view', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 760 });
  await page.goto('/');
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(2000);
  await page.keyboard.up('ArrowRight');

  await page.setViewportSize({ width: 390, height: 780 });
  await expect.poll(() => objectTouchesEdge(page)).toBe(false);
});

test('a marked target appears only when asked for', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 760 });
  await page.goto('/');
  await expect(page.locator('#scene-canvas')).toBeVisible();
  await expect.poll(() => scenePixels(page)).toBeGreaterThan(0);
  const plain = await scenePixels(page);

  await page.goto('/?target=1');
  await expect(page.locator('#scene-canvas')).toBeVisible();
  await expect.poll(() => scenePixels(page)).toBeGreaterThan(plain * 1.05);
});

const CORNERS = [
  ['ArrowRight', 'ArrowUp'],
  ['ArrowRight', 'ArrowDown'],
  ['ArrowLeft', 'ArrowUp'],
  ['ArrowLeft', 'ArrowDown'],
] as const;

/** Reads the drawn scene, counting bright pixels overall and along each edge. */
const readScene = (page: Page) =>
  page.evaluate(async () => {
    const canvas = document.querySelector('#scene-canvas') as HTMLCanvasElement;
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    const bitmap = await createImageBitmap(canvas);
    const copy = document.createElement('canvas');
    copy.width = bitmap.width;
    copy.height = bitmap.height;
    const context = copy.getContext('2d') as CanvasRenderingContext2D;
    context.drawImage(bitmap, 0, 0);
    const { data, width, height } = context.getImageData(0, 0, copy.width, copy.height);
    let bright = 0;
    for (let index = 1; index < data.length; index += 4) {
      if ((data[index] as number) > 60) bright += 1;
    }
    const isScene = (x: number, y: number) => (data[(y * width + x) * 4 + 1] as number) > 60;
    let touchesEdge = false;
    for (let x = 0; x < width; x += 2) {
      touchesEdge ||= isScene(x, 0) || isScene(x, height - 1);
    }
    for (let y = 0; y < height; y += 2) {
      touchesEdge ||= isScene(0, y) || isScene(width - 1, y);
    }
    return { bright, touchesEdge };
  });

const objectTouchesEdge = async (page: Page) => (await readScene(page)).touchesEdge;
const scenePixels = async (page: Page) => (await readScene(page)).bright;

for (const [viewportName, viewport] of [
  ['wide', { width: 1280, height: 760 }],
  ['narrow', { width: 390, height: 780 }],
] as const) {
  test(`the object stays fully in view at every corner of a ${viewportName} scene`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.locator('#scene-canvas')).toBeVisible();
    await page.keyboard.down('q');
    await page.waitForTimeout(600);
    await page.keyboard.up('q');

    for (const keys of CORNERS) {
      for (const key of keys) await page.keyboard.down(key);
      await page.waitForTimeout(2000);
      for (const key of keys) await page.keyboard.up(key);
      expect(await objectTouchesEdge(page)).toBe(false);
    }
  });
}
