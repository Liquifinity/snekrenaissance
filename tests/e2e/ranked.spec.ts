import { expect, test } from '@playwright/test';

test('ranked browser flow uses Worker+D1 and survives leaderboard read failure', async ({ page }) => {
  let releaseStart!: () => void;
  let startRouteHit = false;
  const holdStart = new Promise<void>((resolve) => {
    releaseStart = resolve;
  });

  await page.route('**/rank/api/games', async (route) => {
    startRouteHit = true;
    await holdStart;
    await route.continue();
  });

  await page.goto('/');
  const apiBase = await page.evaluate(() => (
    window as unknown as { __SNEK_TEST__?: { apiBase: string } }
  ).__SNEK_TEST__?.apiBase ?? null);
  expect(apiBase).toBe('/rank');

  await expect(page.locator('[data-copy-line]').nth(0)).toHaveText('just because ChatGPT');
  await expect(page.locator('[data-copy-line]').nth(1)).toHaveText("didn't complete my image.");

  await page.locator('[data-action="continue"]').click();
  await page.locator('input[name="username"]').fill('ranked-e2e');
  await page.locator('[data-action="play"]').click();

  await expect.poll(() => startRouteHit).toBe(true);
  await expect(page.locator('[data-session-status="starting"]')).toBeVisible();
  await expect(page.locator('[data-hud-length]')).toHaveCount(0);

  releaseStart();
  await page.unroute('**/rank/api/games');
  await expect(page.locator('[data-hud-length]')).toContainText('12');

  await page.evaluate(() => {
    const harness = (window as unknown as {
      __SNEK_TEST__?: { forceGameOver: (result: { maxLength: number; foodEaten: number; durationMs: number }) => void };
    }).__SNEK_TEST__;
    if (!harness) throw new Error('missing ranked E2E harness');
    harness.forceGameOver({ maxLength: 16, foodEaten: 1, durationMs: 1_000 });
  });

  await expect(page.locator('[data-view="game-over"]')).toBeVisible();
  await expect(page.locator('.result-metrics')).toContainText('WORLD');
  await expect(page.locator('.result-metrics')).toContainText(/#\d+/);

  await page.locator('[data-action="rank"]').click();
  await expect(page.locator('[data-leaderboard-state="ready"]')).toBeVisible();
  await expect(page.locator('[data-leaderboard-row]')).toContainText('ranked-e2e');
  await expect(page.locator('[data-leaderboard-row][data-self="true"]')).toBeVisible();

  await page.locator('[data-action="back"]').click();
  await expect(page.locator('[data-view="game-over"]')).toBeVisible();

  await page.route('**/rank/api/leaderboard**', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        error: {
          code: 'TEMPORARY_FAILURE',
          message: 'forced E2E leaderboard failure',
          retryable: true
        }
      })
    });
  });

  await page.locator('[data-action="rank"]').click();
  await expect(page.locator('[data-leaderboard-state="error"]')).toBeVisible();
  await expect(page.locator('[role="alert"]')).toContainText('leaderboard');

  await page.locator('[data-action="back"]').click();
  await expect(page.locator('[data-action="replay"]')).toBeVisible();
  await page.locator('[data-action="replay"]').click();
  await expect(page.locator('[data-hud-length]')).toContainText('12');
});
