import { expect, test, type Page, type Locator } from '@playwright/test';

async function startGame(page: Page, username: string): Promise<void> {
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

async function joystickKnobOffset(knob: Locator): Promise<{ x: number; y: number }> {
  return knob.evaluate((element) => {
    const transform = getComputedStyle(element).transform;
    if (!transform || transform === 'none') return { x: 0, y: 0 };
    const matrix = new DOMMatrixReadOnly(transform);
    return { x: matrix.m41, y: matrix.m42 };
  });
}

test('desktop V3 preserves edge-triggered camera switching without runtime errors', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await startGame(page, 'desktop-v3');

  const app = page.locator('#app');
  await expect(app).toHaveAttribute('data-camera-mode', 'chase');
  await page.keyboard.press('x');
  await expect(app).toHaveAttribute('data-camera-mode', 'overview');
  await page.keyboard.press('x');
  await expect(app).toHaveAttribute('data-camera-mode', 'chase');
  await expect(app).toHaveAttribute('data-screen', 'game');
  expect(await app.getAttribute('data-runtime-error')).not.toBe('true');
});

test('pixel backing buffer stays reduced and independent of high DPR', async ({ page }) => {
  await startGame(page, 'pixel-v3');

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

test('joystick cursor follows physical screen direction on both mobile layouts', async ({ page }, testInfo) => {
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

test('mobile V3 remains responsive across orientation change and resets the joystick sector', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile-'));
  await startGame(page, `mobile-v3-${testInfo.project.name}`);

  const app = page.locator('#app');
  const joystick = page.locator('[data-joystick]');
  await expect(joystick).toBeVisible();
  await expect(page.locator('[data-camera-toggle]')).toBeVisible();

  const box = await joystick.boundingBox();
  if (!box) throw new Error('missing joystick box');
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  const pointerId = 7;

  await joystick.dispatchEvent('pointerdown', { pointerId, clientX: centerX, clientY: centerY });
  await joystick.dispatchEvent('pointermove', {
    pointerId,
    clientX: box.x + box.width - 4,
    clientY: centerY
  });
  await expect(app).toHaveAttribute('data-joystick-sector', 'right');
  await joystick.dispatchEvent('pointerup', { pointerId, clientX: centerX, clientY: centerY });
  await expect(app).toHaveAttribute('data-joystick-sector', 'neutral');

  const beforeResize = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth
  }));
  expect(beforeResize.scrollWidth).toBeLessThanOrEqual(beforeResize.innerWidth);

  const current = page.viewportSize();
  if (!current) throw new Error('missing viewport');
  await page.setViewportSize({ width: current.height, height: current.width });
  await page.evaluate(() => window.dispatchEvent(new Event('orientationchange')));
  await expect(app).toHaveAttribute('data-joystick-sector', 'neutral');
  await expect(app).toHaveAttribute('data-screen', 'game');

  const afterResize = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    runtimeError: document.querySelector('#app')?.getAttribute('data-runtime-error')
  }));
  expect(afterResize.scrollWidth).toBeLessThanOrEqual(afterResize.innerWidth);
  expect(afterResize.runtimeError).not.toBe('true');
});
