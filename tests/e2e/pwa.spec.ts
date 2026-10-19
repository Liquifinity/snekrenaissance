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

test('INSTALL route exposes a real browser install lifecycle without breaking the game shell', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');

  await page.goto('/?install=1');

  const panel = page.locator('[data-install-experience]');
  const action = panel.locator('button');

  await expect(page.locator('[data-view="intro"]')).toBeVisible();
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('INSTALL SNEK RENAISSANCE');

  const defaultPrevented = await page.evaluate(() => {
    const browserWindow = window as typeof window & {
      __SNEK_PROMPT_CALLED__?: boolean;
    };
    const event = new Event('beforeinstallprompt', { cancelable: true });
    Object.defineProperties(event, {
      prompt: {
        value: async () => {
          browserWindow.__SNEK_PROMPT_CALLED__ = true;
        }
      },
      userChoice: {
        value: Promise.resolve({ outcome: 'accepted', platform: 'web' })
      }
    });

    window.dispatchEvent(event);
    return event.defaultPrevented;
  });

  expect(defaultPrevented).toBe(true);
  await expect(action).toBeEnabled();
  await expect(action).toHaveText('INSTALL');

  await action.click();
  await expect.poll(() => page.evaluate(() => (
    window as typeof window & { __SNEK_PROMPT_CALLED__?: boolean }
  ).__SNEK_PROMPT_CALLED__)).toBe(true);
  await expect(action).toHaveText('INSTALLING');
  await expect(panel).toContainText('Installation accepted');

  await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
  await expect(action).toBeDisabled();
  await expect(action).toHaveText('INSTALLED');
  await expect(panel).toContainText('Installed. Launch SNEK RENAISSANCE from your device.');
});
