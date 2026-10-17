import { expect, test } from '@playwright/test';

test('V2.1 stays local-first even when an HTTP ranking base is configured', async ({ page }) => {
  const apiRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/')) {
      apiRequests.push(`${request.method()} ${request.url()}`);
    }
  });

  await page.goto('/');
  const runtime = await page.evaluate(() => {
    const harness = (window as unknown as {
      __SNEK_TEST__?: {
        apiBase: string;
        gatewayKind: string;
        forceGameOver: (result: {
          rulesetId: 'pixel-flight-grid-v2-1';
          score: number;
          foodsCollected: number;
          length: number;
          maxLength: number;
          foodEaten: number;
          durationMs: number;
        }) => void;
      };
    }).__SNEK_TEST__;
    return harness ? { apiBase: harness.apiBase, gatewayKind: harness.gatewayKind } : null;
  });
  expect(runtime).toEqual({ apiBase: '/rank', gatewayKind: 'HttpSessionGateway' });

  await page.locator('[data-action="continue"]').click();
  await page.locator('input[name="username"]').fill('v2-1-local');
  await page.locator('[data-action="play"]').click();

  await expect(page.locator('[data-hud-score]')).toHaveText('SCORE 0');
  await expect(page.locator('[data-hud-length]')).toHaveText('LENGTH 6');
  await page.waitForTimeout(250);
  expect(apiRequests.filter((entry) => entry.includes('/api/games'))).toEqual([]);

  await page.evaluate(() => {
    const harness = (window as unknown as {
      __SNEK_TEST__?: {
        forceGameOver: (result: {
          rulesetId: 'pixel-flight-grid-v2-1';
          score: number;
          foodsCollected: number;
          length: number;
          maxLength: number;
          foodEaten: number;
          durationMs: number;
        }) => void;
      };
    }).__SNEK_TEST__;
    if (!harness) throw new Error('missing ranked E2E harness');
    harness.forceGameOver({
      rulesetId: 'pixel-flight-grid-v2-1',
      score: 7,
      foodsCollected: 7,
      length: 20,
      maxLength: 20,
      foodEaten: 7,
      durationMs: 4_000
    });
  });

  await expect(page.locator('[data-view="game-over"]')).toBeVisible();
  await expect(page.locator('.result-metrics')).toContainText('SCORE');
  await expect(page.locator('.result-metrics')).toContainText('7');
  await expect(page.locator('.result-metrics')).toContainText('PERSONAL BEST');
  await expect(page.locator('.result-metrics')).not.toContainText('WORLD');
  expect(apiRequests.filter((entry) => entry.includes('/api/'))).toEqual([]);

  const bests = await page.evaluate(() => ({
    v2: localStorage.getItem('snek.localBest.pixelGridV2'),
    v2_1: localStorage.getItem('snek.localBest.pixelGridV2_1')
  }));
  expect(bests.v2).toBeNull();
  expect(bests.v2_1).toBe('7');

  await page.locator('[data-action="rank"]').click();
  await expect(page.locator('[data-view="rank"]')).toBeVisible();
  await expect(page.locator('[data-view="rank"]')).toContainText('PERSONAL BEST');
  await expect(page.locator('[data-view="rank"]')).toContainText('7');
  expect(apiRequests.filter((entry) => entry.includes('/api/'))).toEqual([]);
});
