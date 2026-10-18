import { expect, test, type Page } from '@playwright/test';

type Vec3 = { x: number; y: number; z: number };
type V3Harness = {
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
    const harness = (window as unknown as { __SNEK_TEST__?: V3Harness }).__SNEK_TEST__;
    if (!harness) throw new Error('missing V3 E2E harness');
    harness.setManualClock(true);
  });
  await settleFrames(page, 4);
}

async function settleFrames(page: Page, count: number): Promise<void> {
  await page.evaluate((frames) => new Promise<void>((resolve) => {
    let remaining = frames;
    const tick = () => {
      remaining -= 1;
      if (remaining <= 0) resolve();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), count);
}

function parseVec3(value: string | null): Vec3 {
  if (!value) throw new Error('missing vector telemetry');
  const coordinates = value.split(',').map(Number);
  if (coordinates.length !== 3 || coordinates.some((coordinate) => !Number.isFinite(coordinate))) {
    throw new Error(`invalid vector telemetry: ${value}`);
  }
  return { x: coordinates[0], y: coordinates[1], z: coordinates[2] };
}

async function cameraPosition(page: Page): Promise<Vec3> {
  return page.evaluate(() => {
    const harness = (window as unknown as { __SNEK_TEST__?: V3Harness }).__SNEK_TEST__;
    if (!harness) throw new Error('missing V3 E2E harness');
    return harness.getCameraPosition();
  });
}

async function cameraDistanceFromHead(page: Page): Promise<number> {
  const camera = await cameraPosition(page);
  const head = parseVec3(await page.locator('#app').getAttribute('data-head-render-world'));
  return Math.hypot(camera.x - head.x, camera.y - head.y, camera.z - head.z);
}

test('desktop mouse wheel zooms chase camera and persists into overview', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await startGame(page, 'v3-camera-wheel');

  const canvas = page.locator('#game-canvas');
  const app = page.locator('#app');
  const before = await cameraDistanceFromHead(page);

  await canvas.hover();
  await page.mouse.wheel(0, 700);
  await settleFrames(page, 12);
  const zoomedOut = await cameraDistanceFromHead(page);
  expect(zoomedOut).toBeGreaterThan(before * 1.05);

  await page.mouse.wheel(0, -700);
  await settleFrames(page, 12);
  const zoomedIn = await cameraDistanceFromHead(page);
  expect(zoomedIn).toBeLessThan(zoomedOut);

  await page.mouse.wheel(0, 700);
  await settleFrames(page, 12);
  await page.locator('[data-camera-toggle]').click();
  await expect(app).toHaveAttribute('data-camera-mode', 'overview');
  const overview = await cameraPosition(page);
  expect(Math.abs(overview.z)).toBeGreaterThan(3.6 * 1.8);
});

test('mobile two-finger pinch zooms out without creating a turn intent', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile-'));
  await startGame(page, `v3-camera-pinch-${testInfo.project.name}`);

  const canvas = page.locator('#game-canvas');
  const app = page.locator('#app');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('missing canvas box');

  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  const before = await cameraDistanceFromHead(page);

  await canvas.dispatchEvent('pointerdown', {
    pointerId: 41,
    pointerType: 'touch',
    clientX: centerX - 30,
    clientY: centerY
  });
  await canvas.dispatchEvent('pointerdown', {
    pointerId: 42,
    pointerType: 'touch',
    clientX: centerX + 30,
    clientY: centerY
  });
  await canvas.dispatchEvent('pointermove', {
    pointerId: 41,
    pointerType: 'touch',
    clientX: centerX - 90,
    clientY: centerY
  });
  await canvas.dispatchEvent('pointermove', {
    pointerId: 42,
    pointerType: 'touch',
    clientX: centerX + 90,
    clientY: centerY
  });

  await settleFrames(page, 12);
  const after = await cameraDistanceFromHead(page);
  expect(after).toBeGreaterThan(before * 1.05);
  await expect(app).toHaveAttribute('data-pending-turn', 'none');

  await canvas.dispatchEvent('pointerup', {
    pointerId: 41,
    pointerType: 'touch',
    clientX: centerX - 90,
    clientY: centerY
  });
  await canvas.dispatchEvent('pointerup', {
    pointerId: 42,
    pointerType: 'touch',
    clientX: centerX + 90,
    clientY: centerY
  });
});
