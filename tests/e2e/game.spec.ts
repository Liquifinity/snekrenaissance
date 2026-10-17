import { expect, test } from '@playwright/test';

async function startGame(page: import('@playwright/test').Page, username: string): Promise<void> {
  await page.goto('/');
  await expect(page.locator('[data-copy-line]').nth(0)).toHaveText('just because ChatGPT');
  await expect(page.locator('[data-copy-line]').nth(1)).toHaveText('didnt complete my image.');
  await page.locator('[data-action="continue"]').click();
  await page.locator('input[name="username"]').fill(username);
  await page.locator('[data-action="play"]').click();
  await expect(page.locator('[data-hud-score]')).toHaveText('SCORE 0');
  await expect(page.locator('[data-hud-length]')).toHaveText('LENGTH 6');
  await expect(page.locator('[data-progress-track]')).toBeVisible();
  await expect(page.locator('#game-canvas')).toBeVisible();
}

async function numericAppAttribute(
  page: import('@playwright/test').Page,
  attribute: string
): Promise<number> {
  const raw = await page.locator('#app').getAttribute(attribute);
  const value = Number(raw);
  if (raw === null || !Number.isFinite(value)) {
    throw new Error(`missing numeric app attribute ${attribute}: ${raw}`);
  }
  return value;
}

async function joystickKnobOffset(knob: import('@playwright/test').Locator): Promise<{ x: number; y: number }> {
  return knob.evaluate((element) => {
    const transform = getComputedStyle(element).transform;
    if (!transform || transform === 'none') return { x: 0, y: 0 };
    const matrix = new DOMMatrixReadOnly(transform);
    return { x: matrix.m41, y: matrix.m42 };
  });
}

test('desktop V2.1 holds continuous steering and preserves camera switching', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await startGame(page, 'desktop-snek');

  const app = page.locator('#app');
  await expect(app).toHaveAttribute('data-camera-mode', 'chase');
  await page.keyboard.press('x');
  await expect(app).toHaveAttribute('data-camera-mode', 'overview');
  await page.keyboard.press('x');
  await expect(app).toHaveAttribute('data-camera-mode', 'chase');

  await page.keyboard.down('ArrowRight');
  await expect.poll(() => numericAppAttribute(page, 'data-input-yaw')).toBe(1);
  const rightStart = await numericAppAttribute(page, 'data-head-yaw');
  await page.waitForTimeout(120);
  const rightMid = await numericAppAttribute(page, 'data-head-yaw');
  await page.waitForTimeout(120);
  const rightEnd = await numericAppAttribute(page, 'data-head-yaw');
  expect(rightMid).toBeGreaterThan(rightStart + 0.05);
  expect(rightEnd).toBeGreaterThan(rightMid + 0.05);

  await page.keyboard.up('ArrowRight');
  await expect.poll(() => numericAppAttribute(page, 'data-input-yaw')).toBe(0);
  await page.waitForTimeout(80);
  const neutralYaw = await numericAppAttribute(page, 'data-head-yaw');
  await page.waitForTimeout(100);
  const neutralYawLater = await numericAppAttribute(page, 'data-head-yaw');
  expect(Math.abs(neutralYawLater - neutralYaw)).toBeLessThan(0.01);

  await page.keyboard.down('ArrowLeft');
  await expect.poll(() => numericAppAttribute(page, 'data-input-yaw')).toBe(-1);
  const leftStart = await numericAppAttribute(page, 'data-head-yaw');
  await page.waitForTimeout(120);
  const leftEnd = await numericAppAttribute(page, 'data-head-yaw');
  expect(leftEnd).toBeLessThan(leftStart - 0.05);
  await page.keyboard.up('ArrowLeft');

  await page.keyboard.down('ArrowUp');
  await expect.poll(() => numericAppAttribute(page, 'data-input-pitch')).toBe(1);
  const upStart = await numericAppAttribute(page, 'data-head-pitch');
  await page.waitForTimeout(120);
  const upEnd = await numericAppAttribute(page, 'data-head-pitch');
  expect(upEnd).toBeGreaterThan(upStart + 0.05);
  await page.keyboard.up('ArrowUp');

  await page.keyboard.down('ArrowDown');
  await expect.poll(() => numericAppAttribute(page, 'data-input-pitch')).toBe(-1);
  const downStart = await numericAppAttribute(page, 'data-head-pitch');
  await page.waitForTimeout(120);
  const downEnd = await numericAppAttribute(page, 'data-head-pitch');
  expect(downEnd).toBeLessThan(downStart - 0.05);
  await page.keyboard.up('ArrowDown');

  await expect(app).toHaveAttribute('data-screen', 'game');
});

test('pixel backing buffer stays reduced and independent of high DPR', async ({ page }) => {
  await startGame(page, 'pixel-snek');

  const dimensions = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
    if (!canvas) throw new Error('missing canvas');
    const rect = canvas.getBoundingClientRect();
    return {
      cssWidth: rect.width,
      cssHeight: rect.height,
      backingWidth: canvas.width,
      backingHeight: canvas.height,
      dpr: window.devicePixelRatio
    };
  });

  expect(dimensions.dpr).toBeGreaterThanOrEqual(1);
  expect(Math.abs(dimensions.backingWidth - dimensions.cssWidth * 0.5)).toBeLessThanOrEqual(1);
  expect(Math.abs(dimensions.backingHeight - dimensions.cssHeight * 0.5)).toBeLessThanOrEqual(1);
  expect(dimensions.backingWidth).toBeLessThan(dimensions.cssWidth);
  expect(dimensions.backingHeight).toBeLessThan(dimensions.cssHeight);
  if (dimensions.dpr > 1) {
    expect(dimensions.backingWidth).toBeLessThan(dimensions.cssWidth * dimensions.dpr);
    expect(dimensions.backingHeight).toBeLessThan(dimensions.cssHeight * dimensions.dpr);
  }
});

test('joystick cursor follows the physical screen direction on both mobile layouts', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile-'));
  await startGame(page, `cursor-${testInfo.project.name}`);

  const joystick = page.locator('[data-joystick]');
  const knob = page.locator('.joystick-knob');
  const box = await joystick.boundingBox();
  if (!box) throw new Error('missing joystick box');

  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  const leftX = box.x + 4;
  const rightX = box.x + box.width - 4;
  const upY = box.y + 4;
  const downY = box.y + box.height - 4;
  const pointerId = 17;

  await joystick.dispatchEvent('pointerdown', { pointerId, clientX: centerX, clientY: centerY });

  await joystick.dispatchEvent('pointermove', { pointerId, clientX: rightX, clientY: centerY });
  await expect.poll(async () => (await joystickKnobOffset(knob)).x).toBeGreaterThan(0);

  await joystick.dispatchEvent('pointermove', { pointerId, clientX: centerX, clientY: centerY });
  await expect.poll(async () => Math.abs((await joystickKnobOffset(knob)).x)).toBeLessThan(1);

  await joystick.dispatchEvent('pointermove', { pointerId, clientX: leftX, clientY: centerY });
  await expect.poll(async () => (await joystickKnobOffset(knob)).x).toBeLessThan(0);

  await joystick.dispatchEvent('pointermove', { pointerId, clientX: centerX, clientY: centerY });
  await expect.poll(async () => Math.abs((await joystickKnobOffset(knob)).y)).toBeLessThan(1);

  await joystick.dispatchEvent('pointermove', { pointerId, clientX: centerX, clientY: upY });
  await expect.poll(async () => (await joystickKnobOffset(knob)).y).toBeLessThan(0);

  await joystick.dispatchEvent('pointermove', { pointerId, clientX: centerX, clientY: centerY });
  await expect.poll(async () => Math.abs((await joystickKnobOffset(knob)).y)).toBeLessThan(1);

  await joystick.dispatchEvent('pointermove', { pointerId, clientX: centerX, clientY: downY });
  await expect.poll(async () => (await joystickKnobOffset(knob)).y).toBeGreaterThan(0);

  await joystick.dispatchEvent('pointerup', { pointerId, clientX: centerX, clientY: downY });
});

test('mobile V2.1 joystick steers continuously without recenter/rearm and remains responsive', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile-'));
  await startGame(page, `mobile-${testInfo.project.name}`);

  const app = page.locator('#app');
  const joystick = page.locator('[data-joystick]');
  await expect(joystick).toBeVisible();
  await expect(page.locator('[data-camera-toggle]')).toBeVisible();

  await page.locator('[data-camera-toggle]').click();
  await expect(app).toHaveAttribute('data-camera-mode', 'overview');
  await page.locator('[data-camera-toggle]').click();
  await expect(app).toHaveAttribute('data-camera-mode', 'chase');

  const box = await joystick.boundingBox();
  if (!box) throw new Error('missing joystick box');
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  const leftX = box.x + 4;
  const rightX = box.x + box.width - 4;
  const upperRightY = box.y + box.height * 0.2;
  const pointerId = 7;

  await joystick.dispatchEvent('pointerdown', { pointerId, clientX: centerX, clientY: centerY });
  await joystick.dispatchEvent('pointermove', { pointerId, clientX: rightX, clientY: centerY });
  await expect.poll(() => numericAppAttribute(page, 'data-input-yaw')).toBeGreaterThan(0.5);
  const rightStart = await numericAppAttribute(page, 'data-head-yaw');
  await page.waitForTimeout(120);
  const rightEnd = await numericAppAttribute(page, 'data-head-yaw');
  expect(rightEnd).toBeGreaterThan(rightStart + 0.03);

  await joystick.dispatchEvent('pointermove', { pointerId, clientX: centerX, clientY: centerY });
  await expect.poll(async () => Math.abs(await numericAppAttribute(page, 'data-input-yaw'))).toBeLessThan(0.01);
  await page.waitForTimeout(80);
  const neutralStart = await numericAppAttribute(page, 'data-head-yaw');
  await page.waitForTimeout(100);
  const neutralEnd = await numericAppAttribute(page, 'data-head-yaw');
  expect(Math.abs(neutralEnd - neutralStart)).toBeLessThan(0.01);

  // Same pointer remains active: direct opposite steering requires no pointer-up/rearm cycle.
  await joystick.dispatchEvent('pointermove', { pointerId, clientX: leftX, clientY: centerY });
  await expect.poll(() => numericAppAttribute(page, 'data-input-yaw')).toBeLessThan(-0.5);
  const leftStart = await numericAppAttribute(page, 'data-head-yaw');
  await page.waitForTimeout(120);
  const leftEnd = await numericAppAttribute(page, 'data-head-yaw');
  expect(leftEnd).toBeLessThan(leftStart - 0.03);

  await joystick.dispatchEvent('pointermove', { pointerId, clientX: rightX, clientY: upperRightY });
  await expect.poll(() => numericAppAttribute(page, 'data-input-yaw')).toBeGreaterThan(0.2);
  await expect.poll(() => numericAppAttribute(page, 'data-input-pitch')).toBeGreaterThan(0.2);

  await joystick.dispatchEvent('pointerup', { pointerId, clientX: rightX, clientY: upperRightY });
  await expect.poll(async () => Math.abs(await numericAppAttribute(page, 'data-input-yaw'))).toBeLessThan(0.01);
  await expect.poll(async () => Math.abs(await numericAppAttribute(page, 'data-input-pitch'))).toBeLessThan(0.01);

  const beforeResize = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth
  }));
  expect(beforeResize.scrollWidth).toBeLessThanOrEqual(beforeResize.innerWidth);

  const current = page.viewportSize();
  if (!current) throw new Error('missing viewport');
  await page.setViewportSize({ width: current.height, height: current.width });
  await page.evaluate(() => window.dispatchEvent(new Event('orientationchange')));
  await page.waitForTimeout(100);
  await expect(app).toHaveAttribute('data-input-yaw', '0');
  await expect(app).toHaveAttribute('data-input-pitch', '0');
  await expect(app).toHaveAttribute('data-screen', 'game');

  const afterResize = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    runtimeError: document.querySelector('#app')?.getAttribute('data-runtime-error')
  }));
  expect(afterResize.scrollWidth).toBeLessThanOrEqual(afterResize.innerWidth);
  expect(afterResize.runtimeError).not.toBe('true');
});
