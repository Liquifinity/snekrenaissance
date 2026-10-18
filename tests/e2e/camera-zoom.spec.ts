import { expect, test, type Page } from '@playwright/test';

type Vec3 = { x: number; y: number; z: number };
type V5Harness = {
  setManualClock: (enabled: boolean) => void;
  getCameraPosition: () => Vec3;
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
  });
  await settleFrames(page, 4);
}

async function settleFrames(page: Page, count: number): Promise<void> {
  await page.evaluate((frames) => new Promise<void>((resolve) => {
    let remaining = frames;
    const tick = () => { remaining -= 1; if (remaining <= 0) resolve(); else requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }), count);
}

async function cameraPosition(page: Page): Promise<Vec3> {
  return page.evaluate(() => {
    const harness = (window as unknown as { __SNEK_TEST__?: V5Harness }).__SNEK_TEST__;
    if (!harness) throw new Error('missing V5 E2E harness');
    return harness.getCameraPosition();
  });
}

async function cameraDistanceFromOrigin(page: Page): Promise<number> {
  const camera = await cameraPosition(page);
  return Math.hypot(camera.x, camera.y, camera.z);
}

function normalized(value: Vec3): Vec3 {
  const length = Math.hypot(value.x, value.y, value.z);
  return { x: value.x / length, y: value.y / length, z: value.z / length };
}

function expectVecClose(actual: Vec3, expected: Vec3): void {
  expect(actual.x).toBeCloseTo(expected.x, 7);
  expect(actual.y).toBeCloseTo(expected.y, 7);
  expect(actual.z).toBeCloseTo(expected.z, 7);
}

test('desktop mouse wheel changes only distance of the current orbit', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await startGame(page, 'v5-camera-wheel');
  const canvas = page.locator('#game-canvas');
  const app = page.locator('#app');
  await expect(app).toHaveAttribute('data-camera-mode', 'orbit-board');

  const box = await canvas.boundingBox();
  if (!box) throw new Error('missing canvas box');
  const x = box.x + box.width * 0.65;
  const y = box.y + box.height * 0.5;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 120, y + 60, { steps: 4 });
  await page.mouse.up();

  const beforePosition = await cameraPosition(page);
  const before = Math.hypot(beforePosition.x, beforePosition.y, beforePosition.z);
  await canvas.hover();
  await page.mouse.wheel(0, 700);
  await settleFrames(page, 4);
  const zoomedPosition = await cameraPosition(page);
  const zoomedOut = Math.hypot(zoomedPosition.x, zoomedPosition.y, zoomedPosition.z);
  expect(zoomedOut).toBeGreaterThan(before * 1.05);
  expectVecClose(normalized(zoomedPosition), normalized(beforePosition));

  await page.mouse.wheel(0, -700);
  await settleFrames(page, 4);
  expect(await cameraDistanceFromOrigin(page)).toBeLessThan(zoomedOut);
  await expect(page.locator('[data-camera-toggle]')).toHaveCount(0);
});

test('mobile one-touch orbit can transition through pinch and back without a camera jump', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile-'));
  await startGame(page, `v5-camera-touch-${testInfo.project.name}`);
  const canvas = page.locator('#game-canvas');
  const app = page.locator('#app');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('missing canvas box');
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;

  await canvas.dispatchEvent('pointerdown', { pointerId: 41, pointerType: 'touch', clientX: centerX - 30, clientY: centerY });
  await canvas.dispatchEvent('pointermove', { pointerId: 41, pointerType: 'touch', clientX: centerX - 10, clientY: centerY + 10 });
  const orbited = await cameraPosition(page);

  await canvas.dispatchEvent('pointerdown', { pointerId: 42, pointerType: 'touch', clientX: centerX + 50, clientY: centerY + 10 });
  await canvas.dispatchEvent('pointermove', { pointerId: 42, pointerType: 'touch', clientX: centerX + 100, clientY: centerY + 10 });
  await settleFrames(page, 2);
  expect(await cameraDistanceFromOrigin(page)).toBeGreaterThan(Math.hypot(orbited.x, orbited.y, orbited.z));
  await expect(app).toHaveAttribute('data-pending-direction', 'none');

  await canvas.dispatchEvent('pointerup', { pointerId: 42, pointerType: 'touch', clientX: centerX + 100, clientY: centerY + 10 });
  const beforeSmallMove = normalized(await cameraPosition(page));
  await canvas.dispatchEvent('pointermove', { pointerId: 41, pointerType: 'touch', clientX: centerX - 8, clientY: centerY + 11 });
  const afterSmallMove = normalized(await cameraPosition(page));
  const delta = Math.hypot(
    afterSmallMove.x - beforeSmallMove.x,
    afterSmallMove.y - beforeSmallMove.y,
    afterSmallMove.z - beforeSmallMove.z
  );
  expect(delta).toBeGreaterThan(0);
  expect(delta).toBeLessThan(0.05);
  await expect(app).toHaveAttribute('data-camera-mode', 'orbit-board');

  await canvas.dispatchEvent('pointerup', { pointerId: 41, pointerType: 'touch', clientX: centerX - 8, clientY: centerY + 11 });
});
