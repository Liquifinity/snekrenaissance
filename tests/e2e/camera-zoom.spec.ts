import { expect, test, type Page } from '@playwright/test';

type Vec3 = { x: number; y: number; z: number };
type V4Harness = {
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
    const harness = (window as unknown as { __SNEK_TEST__?: V4Harness }).__SNEK_TEST__;
    if (!harness) throw new Error('missing V4 E2E harness');
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

async function cameraDistanceFromOrigin(page: Page): Promise<number> {
  const camera = await page.evaluate(() => {
    const harness = (window as unknown as { __SNEK_TEST__?: V4Harness }).__SNEK_TEST__;
    if (!harness) throw new Error('missing V4 E2E harness');
    return harness.getCameraPosition();
  });
  return Math.hypot(camera.x, camera.y, camera.z);
}

test('desktop mouse wheel zooms only the fixed board camera', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await startGame(page, 'v4-camera-wheel');
  const canvas = page.locator('#game-canvas');
  const app = page.locator('#app');
  await expect(app).toHaveAttribute('data-camera-mode', 'board');
  const before = await cameraDistanceFromOrigin(page);
  await canvas.hover();
  await page.mouse.wheel(0, 700);
  await settleFrames(page, 4);
  const zoomedOut = await cameraDistanceFromOrigin(page);
  expect(zoomedOut).toBeGreaterThan(before * 1.05);
  await page.mouse.wheel(0, -700);
  await settleFrames(page, 4);
  const zoomedIn = await cameraDistanceFromOrigin(page);
  expect(zoomedIn).toBeLessThan(zoomedOut);
  await expect(page.locator('[data-camera-toggle]')).toHaveCount(0);
});

test('mobile two-finger pinch zooms board camera without creating a movement command', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile-'));
  await startGame(page, `v4-camera-pinch-${testInfo.project.name}`);
  const canvas = page.locator('#game-canvas');
  const app = page.locator('#app');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('missing canvas box');
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  const before = await cameraDistanceFromOrigin(page);

  await canvas.dispatchEvent('pointerdown', { pointerId: 41, pointerType: 'touch', clientX: centerX - 30, clientY: centerY });
  await canvas.dispatchEvent('pointerdown', { pointerId: 42, pointerType: 'touch', clientX: centerX + 30, clientY: centerY });
  await canvas.dispatchEvent('pointermove', { pointerId: 41, pointerType: 'touch', clientX: centerX - 90, clientY: centerY });
  await canvas.dispatchEvent('pointermove', { pointerId: 42, pointerType: 'touch', clientX: centerX + 90, clientY: centerY });
  await settleFrames(page, 4);

  const after = await cameraDistanceFromOrigin(page);
  expect(after).toBeGreaterThan(before * 1.05);
  await expect(app).toHaveAttribute('data-pending-direction', 'none');
  await expect(app).toHaveAttribute('data-camera-mode', 'board');

  await canvas.dispatchEvent('pointerup', { pointerId: 41, pointerType: 'touch', clientX: centerX - 90, clientY: centerY });
  await canvas.dispatchEvent('pointerup', { pointerId: 42, pointerType: 'touch', clientX: centerX + 90, clientY: centerY });
});
