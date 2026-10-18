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
  await expect(page.locator('#game-canvas')).toBeVisible();
}

test('desktop V4 exposes one board camera and no camera toggle', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await startGame(page, 'desktop-v4');
  const app = page.locator('#app');
  await expect(app).toHaveAttribute('data-camera-mode', 'board');
  await expect(page.locator('[data-camera-toggle]')).toHaveCount(0);
  await page.keyboard.press('x');
  await expect(app).toHaveAttribute('data-camera-mode', 'board');
  expect(await app.getAttribute('data-runtime-error')).not.toBe('true');
});

test('pixel backing buffer stays reduced and independent of high DPR', async ({ page }) => {
  await startGame(page, 'pixel-v4');
  const dimensions = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
    if (!canvas) throw new Error('missing canvas');
    const rect = canvas.getBoundingClientRect();
    return { cssWidth: rect.width, cssHeight: rect.height, backingWidth: canvas.width, backingHeight: canvas.height, dpr: window.devicePixelRatio };
  });
  expect(dimensions.dpr).toBeGreaterThanOrEqual(1);
  expect(Math.abs(dimensions.backingWidth - dimensions.cssWidth * 0.5)).toBeLessThanOrEqual(1);
  expect(Math.abs(dimensions.backingHeight - dimensions.cssHeight * 0.5)).toBeLessThanOrEqual(1);
  expect(dimensions.backingWidth).toBeLessThan(dimensions.cssWidth);
  expect(dimensions.backingHeight).toBeLessThan(dimensions.cssHeight);
});

test('mobile V4 exposes six explicit world-direction controls', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile-'));
  await startGame(page, `mobile-v4-${testInfo.project.name}`);
  const pad = page.locator('[data-direction-pad]');
  await expect(pad).toBeVisible();
  const buttons = pad.locator('[data-world-direction]');
  await expect(buttons).toHaveCount(6);
  for (const direction of ['+X', '-X', '+Y', '-Y', '+Z', '-Z']) {
    await expect(pad.locator(`[data-world-direction="${direction}"]`)).toBeVisible();
  }
  await expect(pad.locator('[data-world-direction="+Z"]')).toHaveText('FRENTE');
  await expect(pad.locator('[data-world-direction="-Z"]')).toHaveText('FUNDO');
});

test('mobile V4 remains responsive and fitted after orientation change', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile-'));
  await startGame(page, `orientation-v4-${testInfo.project.name}`);
  const app = page.locator('#app');
  const current = page.viewportSize();
  if (!current) throw new Error('missing viewport');
  await page.setViewportSize({ width: current.height, height: current.width });
  await page.evaluate(() => window.dispatchEvent(new Event('orientationchange')));
  await expect(app).toHaveAttribute('data-camera-mode', 'board');
  await expect(page.locator('[data-direction-pad]')).toBeVisible();
  const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth);
  expect(await app.getAttribute('data-runtime-error')).not.toBe('true');
});
