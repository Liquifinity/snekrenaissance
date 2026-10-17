import { test } from '@playwright/test';

test('diagnose V2.1 post-start browser state', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await page.goto('/');
  await page.locator('[data-action="continue"]').click();
  await page.locator('input[name="username"]').fill('diagnostic');
  await page.locator('[data-action="play"]').click();

  for (const delay of [0, 100, 250, 500]) {
    if (delay > 0) await page.waitForTimeout(delay);
    const state = await page.evaluate(() => {
      const app = document.querySelector<HTMLElement>('#app');
      const view = document.querySelector<HTMLElement>('[data-view]');
      return {
        view: view?.dataset.view ?? null,
        headCell: app?.dataset.headCell ?? null,
        headPoint: app?.dataset.headPoint ?? null,
        headYaw: app?.dataset.headYaw ?? null,
        headPitch: app?.dataset.headPitch ?? null,
        inputYaw: app?.dataset.inputYaw ?? null,
        inputPitch: app?.dataset.inputPitch ?? null,
        runtimeError: app?.dataset.runtimeError ?? null
      };
    });
    console.log(`V21_DIAGNOSTIC delay=${delay}`, JSON.stringify(state));
  }
});
