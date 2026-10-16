import { expect, test } from '@playwright/test';

test('ranked browser flow uses Worker+D1 and survives leaderboard read failure', async ({ page }) => {
  let releaseStart!: () => void;
  let startRouteHit = false;
  const apiRequests: string[] = [];
  const holdStart = new Promise<void>((resolve) => {
    releaseStart = resolve;
  });

  page.on('request', (request) => {
    if (request.url().includes('/api/')) {
      apiRequests.push(`${request.method()} ${request.url()}`);
    }
  });

  await page.route('**/rank/api/games', async (route) => {
    startRouteHit = true;
    await holdStart;
    await route.continue();
  });

  await page.goto('/');
  const runtime = await page.evaluate(() => {
    const harness = (window as unknown as {
      __SNEK_TEST__?: { apiBase: string; gatewayKind: string };
    }).__SNEK_TEST__;
    return harness ? { apiBase: harness.apiBase, gatewayKind: harness.gatewayKind } : null;
  });
  expect(runtime).toEqual({ apiBase: '/rank', gatewayKind: 'HttpSessionGateway' });

  await expect(page.locator('[data-copy-line]').nth(0)).toHaveText('just because ChatGPT');
  await expect(page.locator('[data-copy-line]').nth(1)).toHaveText("didn't complete my image.");

  await page.locator('[data-action="continue"]').click();
  await page.locator('input[name="username"]').fill('ranked-e2e');
  await page.locator('[data-action="play"]').click();

  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'username');
  await expect(page.locator('[data-view="username"]')).toHaveAttribute('data-session-status', 'starting');
  await expect.poll(() => apiRequests.join('\n')).toContain('/api/games');
  await expect.poll(() => startRouteHit).toBe(true);
  await expect(page.locator('[data-hud-length]')).toHaveCount(0);

  releaseStart();
  await expect(page.locator('[data-hud-length]')).toContainText('12');
  await page.unroute('**/rank/api/games');

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
