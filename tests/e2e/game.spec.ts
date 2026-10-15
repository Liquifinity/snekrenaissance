import { expect, test } from '@playwright/test';

test('desktop meme to playable game flow', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('[data-copy-line]').nth(0)).toHaveText('just because ChatGPT');
  await expect(page.locator('[data-copy-line]').nth(1)).toHaveText("didn't complete my image.");

  await page.locator('[data-action="continue"]').click();
  await page.locator('input[name="username"]').fill('e2e-snek');
  await page.locator('[data-action="play"]').click();

  await expect(page.locator('#game-canvas')).toBeVisible();
  await expect(page.locator('[data-hud-length]')).toContainText('12');

  await page.keyboard.down('ArrowLeft');
  await expect(page.locator('#app')).toHaveAttribute('data-input-yaw', '-1');
  await page.keyboard.up('ArrowLeft');
  await expect(page.locator('#app')).toHaveAttribute('data-input-yaw', '0');
});

test('mobile viewport exposes joystick without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('[data-action="continue"]').click();
  await page.locator('input[name="username"]').fill('mobile-snek');
  await page.locator('[data-action="play"]').click();

  await expect(page.locator('[data-joystick]')).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth);
});
