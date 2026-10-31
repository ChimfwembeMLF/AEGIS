import { expect, test } from '@playwright/test';

test('the scene and controls appear, with no request to another host', async ({ page, baseURL }) => {
  const external: string[] = [];
  page.on('request', (request) => {
    if (!request.url().startsWith(baseURL as string) && !request.url().startsWith('blob:')) {
      if (!request.url().startsWith('data:')) external.push(request.url());
    }
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto('/');

  await expect(page.locator('#scene-canvas')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'AEGIS' })).toBeVisible();
  await expect(page.getByText('Move the object').first()).toBeVisible();
  await expect(page.locator('#scene')).toHaveAttribute('data-pose', /"rotation":0/);

  // Hand tracking under the page's real security policy is the last thing to start.
  await expect(page.getByText('Camera on')).toBeVisible({ timeout: 20000 });

  expect(errors).toEqual([]);
  expect(consoleErrors).toEqual([]);
  expect(external).toEqual([]);
});
