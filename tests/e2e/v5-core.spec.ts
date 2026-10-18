import { expect, test, type Page } from '@playwright/test';

type Cell = { x: number; y: number; z: number };
type Vec3 = { x: number; y: number; z: number };
type ViewFrame = { up: string; right: string; intoScreen: string };
type V5Harness = {
  setManualClock: (enabled: boolean) => void;
  consumeFrame: (frameDeltaSeconds: number) => number;
  setFoodCell: (cell: Cell) => void;
  getCameraPosition: () => Vec3;
  getViewFrame: () => ViewFrame;
};

async function startGame(page: Page, username: string): Promise<void> {
  await page.goto('/');
  await page.locator('[data-action="continue"]').click();
  await page.locator('input[name="username"]').fill(username);
  await page.locator('[data-action="play"]').click();
  await expect(page.locator('#game-canvas')).toBeVisible();
  await page.evaluate(() => {
    const harness = (window as unknown as { __SNEK_TEST__?: V5Harness }).__SNEK_TEST__;
    if (!harness) throw new Error('missing V5 E2E harness');
    harness.setManualClock(true);
    harness.setFoodCell({ x: 0, y: 0, z: 0 });
  });
}

async function consume(page: Page, seconds: number): Promise<number> {
  return page.evaluate((value) => {
    const harness = (window as unknown as { __SNEK_TEST__?: V5Harness }).__SNEK_TEST__;
    if (!harness) throw new Error('missing V5 E2E harness');
    return harness.consumeFrame(value);
  }, seconds);
}

async function cameraPosition(page: Page): Promise<Vec3> {
  return page.evaluate(() => {
    const harness = (window as unknown as { __SNEK_TEST__?: V5Harness }).__SNEK_TEST__;
    if (!harness) throw new Error('missing V5 E2E harness');
    return harness.getCameraPosition();
  });
}

async function orbitQuarterTurnRightwardView(page: Page): Promise<void> {
  const canvas = page.locator('#game-canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('missing canvas box');
  const x = box.x + box.width * 0.65;
  const y = box.y + box.height * 0.5;
  await page.mouse.move(x, y);
  await page.mouse.down({ button: 'left' });
  await page.mouse.move(x - Math.PI / 2 / 0.005, y, { steps: 8 });
  await page.mouse.up({ button: 'left' });
}

function expectVecClose(actual: Vec3, expected: Vec3): void {
  expect(actual.x).toBeCloseTo(expected.x, 7);
  expect(actual.y).toBeCloseTo(expected.y, 7);
  expect(actual.z).toBeCloseTo(expected.z, 7);
}

test('desktop V5 starts with V4-equivalent view mapping', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await startGame(page, 'v5-default-view');
  const app = page.locator('#app');
  await expect(app).toHaveAttribute('data-camera-mode', 'orbit-board');
  await expect(app).toHaveAttribute('data-view-up', '+Y');
  await expect(app).toHaveAttribute('data-view-right', '+X');
  await expect(app).toHaveAttribute('data-view-into', '-Z');

  await page.keyboard.press('d');
  await expect(app).toHaveAttribute('data-pending-direction', '+X');
  expect(await consume(page, 1 / 6)).toBe(1);
  await expect(app).toHaveAttribute('data-head-direction', '+X');
});

test('desktop V5 orbit changes the view mapping but does not reinterpret an already-buffered direction', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await startGame(page, 'v5-event-time');
  const app = page.locator('#app');

  await page.keyboard.press('d');
  await expect(app).toHaveAttribute('data-pending-direction', '+X');
  await orbitQuarterTurnRightwardView(page);
  await expect(app).toHaveAttribute('data-view-up', '+Y');
  await expect(app).toHaveAttribute('data-view-right', '-Z');
  await expect(app).toHaveAttribute('data-view-into', '-X');
  await expect(app).toHaveAttribute('data-pending-direction', '+X');

  expect(await consume(page, 1 / 6)).toBe(1);
  await expect(app).toHaveAttribute('data-head-direction', '+X');
  await page.keyboard.press('d');
  await expect(app).toHaveAttribute('data-pending-direction', '-Z');
});

test('desktop V5 release has no snap/inertia and toroidal movement cannot move the camera', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await startGame(page, 'v5-stable-orbit');
  await orbitQuarterTurnRightwardView(page);
  const released = await cameraPosition(page);
  await page.waitForTimeout(120);
  expectVecClose(await cameraPosition(page), released);

  for (let index = 0; index < 9; index += 1) expect(await consume(page, 1 / 6)).toBe(1);
  expectVecClose(await cameraPosition(page), released);
});

test('desktop V5 rejects direct reversal after a rotated view mapping', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await startGame(page, 'v5-rotated-reversal');
  const app = page.locator('#app');
  await orbitQuarterTurnRightwardView(page);

  await page.keyboard.press('d');
  await expect(app).toHaveAttribute('data-pending-direction', '-Z');
  expect(await consume(page, 1 / 6)).toBe(1);
  await expect(app).toHaveAttribute('data-head-direction', '-Z');

  await page.keyboard.press('a');
  await expect(app).toHaveAttribute('data-pending-direction', 'none');
});
