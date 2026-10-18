import { expect, test, type Page } from '@playwright/test';

type Cell = { x: number; y: number; z: number };
type Vec3 = { x: number; y: number; z: number };
type V4Harness = {
  setManualClock: (enabled: boolean) => void;
  consumeFrame: (frameDeltaSeconds: number) => number;
  setFoodCell: (cell: Cell) => void;
  getCameraPosition: () => Vec3;
};

async function startGame(page: Page, username: string): Promise<void> {
  await page.goto('/');
  await page.locator('[data-action="continue"]').click();
  await page.locator('input[name="username"]').fill(username);
  await page.locator('[data-action="play"]').click();
  await expect(page.locator('#game-canvas')).toBeVisible();
  await page.evaluate(() => {
    const harness = (window as unknown as { __SNEK_TEST__?: V4Harness }).__SNEK_TEST__;
    if (!harness) throw new Error('missing V4 E2E harness');
    harness.setManualClock(true);
    harness.setFoodCell({ x: 0, y: 0, z: 0 });
  });
}

async function consume(page: Page, seconds: number): Promise<number> {
  return page.evaluate((value) => {
    const harness = (window as unknown as { __SNEK_TEST__?: V4Harness }).__SNEK_TEST__;
    if (!harness) throw new Error('missing V4 E2E harness');
    return harness.consumeFrame(value);
  }, seconds);
}

function parseCell(value: string | null): Cell {
  if (!value) throw new Error('missing head cell');
  const [x, y, z] = value.split(',').map(Number);
  return { x, y, z };
}

async function cameraPosition(page: Page): Promise<Vec3> {
  return page.evaluate(() => {
    const harness = (window as unknown as { __SNEK_TEST__?: V4Harness }).__SNEK_TEST__;
    if (!harness) throw new Error('missing V4 E2E harness');
    return harness.getCameraPosition();
  });
}

function expectVecClose(actual: Vec3, expected: Vec3): void {
  expect(actual.x).toBeCloseTo(expected.x, 8);
  expect(actual.y).toBeCloseTo(expected.y, 8);
  expect(actual.z).toBeCloseTo(expected.z, 8);
}

test('desktop V4 keys command absolute world directions and reject direct reversal', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await startGame(page, 'v4-absolute');
  const app = page.locator('#app');
  await expect(app).toHaveAttribute('data-head-direction', '+Z');
  await expect(app).toHaveAttribute('data-pending-direction', 'none');

  await page.keyboard.press('d');
  await expect(app).toHaveAttribute('data-pending-direction', '+X');
  expect(await consume(page, 1 / 6)).toBe(1);
  await expect(app).toHaveAttribute('data-head-direction', '+X');
  expect(parseCell(await app.getAttribute('data-head-cell'))).toEqual({ x: 5, y: 4, z: 4 });

  await page.keyboard.press('a');
  await expect(app).toHaveAttribute('data-pending-direction', 'none');

  await page.keyboard.press('w');
  await expect(app).toHaveAttribute('data-pending-direction', '+Y');
  expect(await consume(page, 1 / 6)).toBe(1);
  await expect(app).toHaveAttribute('data-head-direction', '+Y');
  expect(parseCell(await app.getAttribute('data-head-cell'))).toEqual({ x: 5, y: 5, z: 4 });
});

test('desktop V4 newest valid pre-step direction wins and catch-up consumes it once', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await startGame(page, 'v4-latest');
  const app = page.locator('#app');
  const before = parseCell(await app.getAttribute('data-head-cell'));

  expect(await consume(page, 1 / 12)).toBe(0);
  await page.keyboard.press('d');
  await page.keyboard.press('w');
  await expect(app).toHaveAttribute('data-pending-direction', '+Y');

  expect(await consume(page, 0.25)).toBe(2);
  await expect(app).toHaveAttribute('data-head-direction', '+Y');
  await expect(app).toHaveAttribute('data-pending-direction', 'none');
  expect(parseCell(await app.getAttribute('data-head-cell'))).toEqual({ x: before.x, y: (before.y + 2) % 9, z: before.z });
});

test('V4 board camera is invariant while the snake moves through a toroidal wrap', async ({ page }) => {
  await startGame(page, 'v4-camera-wrap');
  const app = page.locator('#app');
  await expect(app).toHaveAttribute('data-camera-mode', 'board');
  const before = await cameraPosition(page);
  for (let index = 0; index < 9; index += 1) expect(await consume(page, 1 / 6)).toBe(1);
  const after = await cameraPosition(page);
  expectVecClose(after, before);
  await expect(app).toHaveAttribute('data-camera-mode', 'board');
});
