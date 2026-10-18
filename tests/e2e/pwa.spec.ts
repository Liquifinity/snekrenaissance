import { expect, test } from '@playwright/test';

test('desktop PWA registers and relaunches the intro offline', async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');

  await page.goto('/');
  await expect(page.locator('[data-view="intro"]')).toBeVisible();
  await expect(page.locator('[data-action="continue"]')).toBeVisible();

  const manifest = await page.evaluate(async () => {
    const href = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')?.href;
    if (!href) throw new Error('missing manifest link');
    const response = await fetch(href);
    if (!response.ok) throw new Error(`manifest request failed: ${response.status}`);
    return response.json() as Promise<{
      name?: string;
      display?: string;
      start_url?: string;
      scope?: string;
    }>;
  });

  expect(manifest).toMatchObject({
    name: 'SNEK RENAISSANCE',
    display: 'standalone',
    start_url: '.',
    scope: '.'
  });

  await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) throw new Error('service workers unavailable');
    await navigator.serviceWorker.ready;
  });

  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-view="intro"]')).toBeVisible();
    await expect(page.locator('[data-action="continue"]')).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});
