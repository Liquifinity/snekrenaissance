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
  await expect(page.locator('#app')).toHaveAttribute('data-head-yaw', /.+/);
}

async function numberAttribute(
  page: import('@playwright/test').Page,
  name: string
): Promise<number> {
  const raw = await page.locator('#app').getAttribute(name);
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`non-finite ${name}: ${raw}`);
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

test('desktop V2.1 held keyboard steering is continuous and neutral has no stale turn', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await startGame(page, 'desktop-smooth');

  await expect(page.locator('#app')).toHaveAttribute('data-camera-mode', 'chase');
  await page.keyboard.press('x');
  await expect(page.locator('#app')).toHaveAttribute('data-camera-mode', 'overview');
  await page.keyboard.press('x');
  await expect(page.locator('#app')).toHaveAttribute('data-camera-mode', 'chase');

  const initialYaw = await numberAttribute(page, 'data-head-yaw');
  await page.keyboard.down('ArrowRight');
  await expect(page.locator('#app')).toHaveAttribute('data-input-yaw', '1');
  await expect.poll(() => numberAttribute(page, 'data-head-yaw')).toBeGreaterThan(initialYaw + 0.08);
  const firstYaw = await numberAttribute(page, 'data-head-yaw');
  await page.waitForTimeout(100);
  const secondYaw = await numberAttribute(page, 'data-head-yaw');
  expect(secondYaw).toBeGreaterThan(firstYaw + 0.08);

  await page.keyboard.up('ArrowRight');
  await expect(page.locator('#app')).toHaveAttribute('data-input-yaw', '0');
  await page.waitForTimeout(34);
  const neutralYaw = await numberAttribute(page, 'data-head-yaw');
  await page.waitForTimeout(100);
  expect(Math.abs((await numberAttribute(page, 'data-head-yaw')) - neutralYaw)).toBeLessThan(0.02);

  await page.keyboard.down('ArrowLeft');
  await expect(page.locator('#app')).toHaveAttribute('data-input-yaw', '-1');
  await expect.poll(() => numberAttribute(page, 'data-head-yaw')).toBeLessThan(neutralYaw - 0.08);
  await page.keyboard.up('ArrowLeft');

  const initialPitch = await numberAttribute(page, 'data-head-pitch');
  await page.keyboard.down('ArrowUp');
  await expect(page.locator('#app')).toHaveAttribute('data-input-pitch', '1');
  await expect.poll(() => numberAttribute(page, 'data-head-pitch')).toBeGreaterThan(initialPitch + 0.08);
  await page.keyboard.up('ArrowUp');

  const raisedPitch = await numberAttribute(page, 'data-head-pitch');
  await page.keyboard.down('ArrowDown');
  await expect(page.locator('#app')).toHaveAttribute('data-input-pitch', '-1');
  await expect.poll(() => numberAttribute(page, 'data-head-pitch')).toBeLessThan(raisedPitch - 0.08);
  await page.keyboard.up('ArrowDown');
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'game');
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
  await joystick.dispatchEvent('pointermove', { pointerId, clientX: leftX, clientY: centerY });
  await expect.poll(async () => (await joystickKnobOffset(knob)).x).toBeLessThan(0);
  await joystick.dispatchEvent('pointermove', { pointerId, clientX: centerX, clientY: upY });
  await expect.poll(async () => (await joystickKnobOffset(knob)).y).toBeLessThan(0);
  await joystick.dispatchEvent('pointermove', { pointerId, clientX: centerX, clientY: downY });
  await expect.poll(async () => (await joystickKnobOffset(knob)).y).toBeGreaterThan(0);
  await joystick.dispatchEvent('pointerup', { pointerId, clientX: centerX, clientY: downY });
});

test('mobile V2.1 joystick steers continuously through right-center-left without rearm', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile-'));
  await startGame(page, `smooth-${testInfo.project.name}`);

  const joystick = page.locator('[data-joystick]');
  const box = await joystick.boundingBox();
  if (!box) throw new Error('missing joystick box');
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  const rightX = box.x + box.width - 4;
  const leftX = box.x + 4;
  const upY = box.y + 4;
  const pointerId = 23;

  await joystick.dispatchEvent('pointerdown', { pointerId, clientX: centerX, clientY: centerY });
  const initialYaw = await numberAttribute(page, 'data-head-yaw');

  await joystick.dispatchEvent('pointermove', { pointerId, clientX: rightX, clientY: centerY });
  await expect.poll(() => numberAttribute(page, 'data-input-yaw')).toBeGreaterThan(0.5);
  await expect.poll(() => numberAttribute(page, 'data-head-yaw')).toBeGreaterThan(initialYaw + 0.05);
  const rightYaw = await numberAttribute(page, 'data-head-yaw');

  await joystick.dispatchEvent('pointermove', { pointerId, clientX: centerX, clientY: centerY });
  await expect.poll(async () => Math.abs(await numberAttribute(page, 'data-input-yaw'))).toBeLessThan(0.01);

  await joystick.dispatchEvent('pointermove', { pointerId, clientX: leftX, clientY: centerY });
  await expect.poll(() => numberAttribute(page, 'data-input-yaw')).toBeLessThan(-0.5);
  await expect.poll(() => numberAttribute(page, 'data-head-yaw')).toBeLessThan(rightYaw - 0.05);

  await joystick.dispatchEvent('pointermove', { pointerId, clientX: rightX, clientY: upY });
  await expect.poll(() => numberAttribute(page, 'data-input-yaw')).toBeGreaterThan(0.2);
  await expect.poll(() => numberAttribute(page, 'data-input-pitch')).toBeGreaterThan(0.2);

  await joystick.dispatchEvent('pointermove', { pointerId, clientX: centerX, clientY: centerY });
  await expect.poll(async () => Math.abs(await numberAttribute(page, 'data-input-yaw'))).toBeLessThan(0.01);
  await expect.poll(async () => Math.abs(await numberAttribute(page, 'data-input-pitch'))).toBeLessThan(0.01);
  await page.waitForTimeout(34);
  const neutralYaw = await numberAttribute(page, 'data-head-yaw');
  const neutralPitch = await numberAttribute(page, 'data-head-pitch');
  await page.waitForTimeout(100);
  expect(Math.abs((await numberAttribute(page, 'data-head-yaw')) - neutralYaw)).toBeLessThan(0.02);
  expect(Math.abs((await numberAttribute(page, 'data-head-pitch')) - neutralPitch)).toBeLessThan(0.02);

  await joystick.dispatchEvent('pointerup', { pointerId, clientX: centerX, clientY: centerY });
});

test('mobile portrait and landscape keep continuous controls inside viewport across orientation change', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile-'));
  await startGame(page, `mobile-${testInfo.project.name}`);

  const joystick = page.locator('[data-joystick]');
  await expect(joystick).toBeVisible();
  await expect(page.locator('[data-camera-toggle]')).toBeVisible();

  await page.locator('[data-camera-toggle]').click();
  await expect(page.locator('#app')).toHaveAttribute('data-camera-mode', 'overview');
  await page.locator('[data-camera-toggle]').click();
  await expect(page.locator('#app')).toHaveAttribute('data-camera-mode', 'chase');

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
  await expect(page.locator('#app')).toHaveAttribute('data-input-yaw', '0');
  await expect(page.locator('#app')).toHaveAttribute('data-input-pitch', '0');
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'game');

  const afterResize = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    runtimeError: document.querySelector('#app')?.getAttribute('data-runtime-error')
  }));
  expect(afterResize.scrollWidth).toBeLessThanOrEqual(afterResize.innerWidth);
  expect(afterResize.runtimeError).not.toBe('true');
});
