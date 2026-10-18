import { expect, test } from '@playwright/test';

const RULESET = 'pixel-flight-grid-v2-2' as const;

type RankedHarness = {
  apiBase: string;
  gatewayKind: string;
  setFoodCell: (cell: { x: number; y: number; z: number }) => void;
  forceGameOver: (result: {
    rulesetId: typeof RULESET;
    score: number;
    foodsCollected: number;
    length: number;
    maxLength: number;
    foodEaten: number;
    durationMs: number;
  }) => void;
};

function harnessExpression(): string {
  return '__SNEK_TEST__';
}

test('V2.2 stays local-first even when an HTTP ranking base is configured', async ({ page }) => {
  const apiRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/')) {
      apiRequests.push(`${request.method()} ${request.url()}`);
    }
  });

  await page.goto('/');
  const runtime = await page.evaluate(() => {
    const harness = (window as unknown as { __SNEK_TEST__?: RankedHarness }).__SNEK_TEST__;
    return harness ? { apiBase: harness.apiBase, gatewayKind: harness.gatewayKind } : null;
  });
  expect(runtime).toEqual({ apiBase: '/rank', gatewayKind: 'HttpSessionGateway' });

  await page.locator('[data-action="continue"]').click();
  await page.locator('input[name="username"]').fill('v22-local');
  await page.locator('[data-action="play"]').click();

  await expect(page.locator('[data-hud-score]')).toHaveText('SCORE 0');
  await expect(page.locator('[data-hud-length]')).toHaveText('LENGTH 6');
  await page.waitForTimeout(250);
  expect(apiRequests.filter((entry) => entry.includes('/api/games'))).toEqual([]);

  await page.evaluate((ruleset) => {
    const harness = (window as unknown as { __SNEK_TEST__?: RankedHarness }).__SNEK_TEST__;
    if (!harness) throw new Error('missing ranked E2E harness');
    harness.forceGameOver({
      rulesetId: ruleset,
      score: 7,
      foodsCollected: 7,
      length: 20,
      maxLength: 20,
      foodEaten: 7,
      durationMs: 4_000
    });
  }, RULESET);

  await expect(page.locator('[data-view="game-over"]')).toBeVisible();
  await expect(page.locator('.result-metrics')).toContainText('SCORE');
  await expect(page.locator('.result-metrics')).toContainText('7');
  await expect(page.locator('.result-metrics')).toContainText('PERSONAL BEST');
  await expect(page.locator('.result-metrics')).not.toContainText('WORLD');
  expect(apiRequests.filter((entry) => entry.includes('/api/'))).toEqual([]);

  await page.locator('[data-action="rank"]').click();
  await expect(page.locator('[data-view="rank"]')).toBeVisible();
  await expect(page.locator('[data-view="rank"]')).toContainText('PERSONAL BEST');
  await expect(page.locator('[data-view="rank"]')).toContainText('7');
  expect(apiRequests.filter((entry) => entry.includes('/api/'))).toEqual([]);
});

test('V2.2 pickup visibly coincides with the exact committed head cell center', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-action="continue"]').click();
  await page.locator('input[name="username"]').fill('pickup-v22');
  await page.locator('[data-action="play"]').click();
  await expect(page.locator('[data-hud-score]')).toHaveText('SCORE 0');

  const app = page.locator('#app');
  const currentCell = await app.getAttribute('data-head-cell');
  if (!currentCell) throw new Error('missing head cell telemetry');
  const [x, y, z] = currentCell.split(',').map(Number);
  const foodCell = { x, y, z: (z + 2) % 9 };

  await page.evaluate((cell) => {
    const harness = (window as unknown as { __SNEK_TEST__?: RankedHarness }).__SNEK_TEST__;
    if (!harness) throw new Error(`missing ranked E2E harness: ${harnessExpression()}`);
    harness.setFoodCell(cell);
  }, foodCell);

  await expect.poll(() => app.getAttribute('data-last-food-pickup-cell'), { timeout: 2_000 })
    .toBe(`${foodCell.x},${foodCell.y},${foodCell.z}`);

  const foodWorld = await app.getAttribute('data-last-food-pickup-world');
  const headWorld = await app.getAttribute('data-last-food-pickup-head-world');
  expect(foodWorld).not.toBeNull();
  expect(headWorld).toBe(foodWorld);
});
