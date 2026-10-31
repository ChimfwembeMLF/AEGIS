import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

test('recording controls are hidden in normal use', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#recording-panel')).toHaveCount(0);
});

test('recording needs confirmed consent', async ({ page }) => {
  await page.goto('/?record=1');
  await expect(page.locator('#recording-start')).toBeDisabled();
  await page.locator('#recording-consent').check();
  await expect(page.locator('#recording-start')).toBeEnabled();
});

test('a recording downloads hand positions and labels, and no image data', async ({ page }) => {
  await page.goto('/?record=1');
  await expect(page.getByText('Camera on')).toBeVisible({ timeout: 20000 });

  await page.locator('#recording-subject').fill('maintainer-1');
  await page.locator('#recording-consent').check();
  await page.locator('#recording-start').click();

  await page.keyboard.press('0');
  await page.waitForTimeout(800);
  await page.keyboard.press('0');

  const download = page.waitForEvent('download');
  await page.locator('#recording-stop').click();
  const file = await (await download).path();
  const text = readFileSync(file, 'utf8');
  const session = JSON.parse(text);

  expect(session).toMatchObject({ schemaVersion: 1, subjectId: 'maintainer-1', consent: true });
  expect(session.frames.length).toBeGreaterThan(0);
  expect(session.labels).toEqual([expect.objectContaining({ gesture: 'none' })]);
  expect(text).not.toMatch(/data:|base64/);
});

test('typing a subject id does not trigger shortcuts', async ({ page }) => {
  await page.goto('/?record=1');
  await expect(page.getByText('Camera on')).toBeVisible({ timeout: 20000 });
  await page.locator('#recording-subject').fill('');
  await page.locator('#recording-subject').pressSequentially('rc');
  await expect(page.getByText('Camera on')).toBeVisible();
});
