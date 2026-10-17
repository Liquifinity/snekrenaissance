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

test('desktop V2 uses one discrete turn per key press and preserves camera switching', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await startGame(page, 'desktop-snek');

  await expect(page.locator('#app')).toHaveAttribute('data-camera-mode', 'chase');
  await page.keyboard.press('x');
  await expect(page.locator('#app')).toHaveAttribute('data-camera-mode', 'overview');
  await page.keyboard.press('x');
  await expect(page.locator('#app')).toHaveAttribute('data-camera-mode', 'chase');

  await expect(page.locator('#app')).toHaveAttribute('data-head-forward', '+Z');
  await page.keyboard.down('ArrowLeft');
  await expect(page.locator('#app')).toHaveAttribute('data-head-forward', '+X');
  await page.waitForTimeout(600);
  await expect(page.locator('#app')).toHaveAttribute('data-head-forward', '+X');
  await page.keyboard.up('ArrowLeft');
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
  expect(dimensions.backingWidth).toBe(Math.max(1, Math.floor(dimensions.cssWidth * 0.5)));
  expect(dimensions.backingHeight).toBe(Math.max(1, Math.floor(dimensions.cssHeight * 0.5)));
  if (dimensions.dpr > 1) {
    expect(dimensions.backingWidth).toBeLessThan(dimensions.cssWidth * dimensions.dpr);
    expect(dimensions.backingHeight).toBeLessThan(dimensions.cssHeight * dimensions.dpr);
  }
});

test('mobile portrait and landscape keep controls playable, latched, and inside viewport', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile-'));
  await startGame(page, `mobile-${testInfo.project.name}`);

  const joystick = page.locator('[data-joystick]');
  await expect(joystick).toBeVisible();
  await expect(page.locator('[data-camera-toggle]')).toBeVisible();

  await page.locator('[data-camera-toggle]').click();
  await expect(page.locator('#app')).toHaveAttribute('data-camera-mode', 'overview');
  await page.locator('[data-camera-toggle]').click();
  await expect(page.locator('#app')).toHaveAttribute('data-camera-mode', 'chase');

  const box = await joystick.boundingBox();
  if (!box) throw new Error('missing joystick box');
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  const rightX = box.x + box.width - 4;

  await joystick.dispatchEvent('pointerdown', { pointerId: 7, clientX: centerX, clientY: centerY });
  await joystick.dispatchEvent('pointermove', { pointerId: 7, clientX: rightX, clientY: centerY });
  await expect(page.locator('#app')).toHaveAttribute('data-head-forward', '-X');
  await page.waitForTimeout(600);
  await expect(page.locator('#app')).toHaveAttribute('data-head-forward', '-X');

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
