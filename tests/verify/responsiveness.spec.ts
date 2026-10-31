import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { test } from '@playwright/test';

const BENCH_IMAGE = 'fixtures/bench/hand.jpg';

function write(result: object) {
  mkdirSync('reports', { recursive: true });
  writeFileSync('reports/responsiveness.json', `${JSON.stringify(result, null, 2)}\n`);
}

test('measure responsiveness', async ({ page }) => {
  test.setTimeout(120000);
  if (!existsSync(BENCH_IMAGE)) {
    write({ skipped: `${BENCH_IMAGE} is missing` });
    return;
  }
  await page.route('**/bench-hand.jpg', (route) => route.fulfill({ path: BENCH_IMAGE }));
  await page.goto('/tests/e2e/harness.html');
  await page.waitForFunction(() => 'aegisHarness' in window);
  write(await page.evaluate(() => (window as any).aegisHarness.runBenchmark('/bench-hand.jpg')));
});
