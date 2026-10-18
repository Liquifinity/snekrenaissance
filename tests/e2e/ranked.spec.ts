import { expect, test } from '@playwright/test';

const RULESET = 'snek-core-v3' as const;

type RankedHarness = {
  apiBase: string;
  gatewayKind: string;
  setManualClock: (enabled: boolean) => void;
  consumeFrame: (frameDeltaSeconds: number) => number;
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

function parseCell(value: string | null): { x: number; y: number; z: number } {
  if (!value) throw new Error('missing head cell telemetry');
  const [x, y, z] = value.split(',').map(Number);
  if (![x, y, z].every(Number.isInteger)) throw new Error(`invalid head cell: ${value}`);
  return { x, y, z };
}

function nextCell(
  cell: { x: number; y: number; z: number },
  direction: string,
  resolution = 9
): { x: number; y: number; z: number } {
  const wrap = (value: number) => (value + resolution) % resolution;
  if (direction === '+X') return { ...cell, x: wrap(cell.x + 1) };
  if (direction === '-X') return { ...cell, x: wrap(cell.x - 1) };
  if (direction === '+Y') return { ...cell, y: wrap(cell.y + 1) };
  if (direction === '-Y') return { ...cell, y: wrap(cell.y - 1) };
  if (direction === '+Z') return { ...cell, z: wrap(cell.z + 1) };
  if (direction === '-Z') return { ...cell, z: wrap(cell.z - 1) };
  throw new Error(`unknown direction ${direction}`);
}

test('SNEK CORE V3 stays local-first even when an HTTP ranking base is configured', async ({ page }) => {
  const apiRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/')) apiRequests.push(`${request.method()} ${request.url()}`);
  });

  await page.goto('/');
  const runtime = await page.evaluate(() => {
    const harness = (window as unknown as { __SNEK_TEST__?: RankedHarness }).__SNEK_TEST__;
    return harness ? { apiBase: harness.apiBase, gatewayKind: harness.gatewayKind } : null;
  });
  expect(runtime).toEqual({ apiBase: '/rank', gatewayKind: 'HttpSessionGateway' });

  await page.locator('[data-action="continue"]').click();
  await page.locator('input[name="username"]').fill('v3-local');
  await page.locator('[data-action="play"]').click();

  await expect(page.locator('[data-hud-score]')).toHaveText('SCORE 0');
  await expect(page.locator('[data-hud-length]')).toHaveText('LENGTH 6');
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

test('SNEK CORE V3 pickup visibly coincides with the exact committed head cell center', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-action="continue"]').click();
  await page.locator('input[name="username"]').fill('pickup-v3');
  await page.locator('[data-action="play"]').click();
  await expect(page.locator('[data-hud-score]')).toHaveText('SCORE 0');

  const app = page.locator('#app');
  await page.evaluate(() => {
    const harness = (window as unknown as { __SNEK_TEST__?: RankedHarness }).__SNEK_TEST__;
    if (!harness) throw new Error('missing ranked E2E harness');
    harness.setManualClock(true);
  });

  const currentCell = parseCell(await app.getAttribute('data-head-cell'));
  const direction = await app.getAttribute('data-head-direction');
  if (!direction) throw new Error('missing head direction telemetry');
  const foodCell = nextCell(currentCell, direction);

  const steps = await page.evaluate((cell) => {
    const harness = (window as unknown as { __SNEK_TEST__?: RankedHarness }).__SNEK_TEST__;
    if (!harness) throw new Error('missing ranked E2E harness');
    harness.setFoodCell(cell);
    return harness.consumeFrame(1 / 6);
  }, foodCell);
  expect(steps).toBe(1);

  await expect(app).toHaveAttribute(
    'data-last-food-pickup-cell',
    `${foodCell.x},${foodCell.y},${foodCell.z}`
  );
  await expect(page.locator('[data-hud-score]')).toHaveText('SCORE 1');

  const foodWorld = await app.getAttribute('data-last-food-pickup-world');
  const headWorld = await app.getAttribute('data-last-food-pickup-head-world');
  expect(foodWorld).not.toBeNull();
  expect(headWorld).toBe(foodWorld);
  expect(apiRequestsFromPerformance(await page.evaluate(() => performance.getEntriesByType('resource').map((entry) => entry.name)))).toEqual([]);
});

function apiRequestsFromPerformance(resources: string[]): string[] {
  return resources.filter((url) => url.includes('/api/'));
}
