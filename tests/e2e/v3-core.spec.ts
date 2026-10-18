import { expect, test, type Page } from '@playwright/test';

type V3Harness = {
  setManualClock: (enabled: boolean) => void;
  consumeFrame: (frameDeltaSeconds: number) => number;
  setFoodCell: (cell: { x: number; y: number; z: number }) => void;
};

async function startGame(page: Page, username: string): Promise<void> {
  await page.goto('/');
  await page.locator('[data-action="continue"]').click();
  await page.locator('input[name="username"]').fill(username);
  await page.locator('[data-action="play"]').click();
  await expect(page.locator('[data-hud-score]')).toHaveText('SCORE 0');
  await expect(page.locator('#game-canvas')).toBeVisible();
}

async function enableManualClock(page: Page): Promise<void> {
  await page.evaluate(() => {
    const harness = (window as unknown as { __SNEK_TEST__?: V3Harness }).__SNEK_TEST__;
    if (!harness) throw new Error('missing V3 E2E harness');
    harness.setManualClock(true);
  });
}

async function consumeFrame(page: Page, deltaSeconds: number): Promise<number> {
  return page.evaluate((delta) => {
    const harness = (window as unknown as { __SNEK_TEST__?: V3Harness }).__SNEK_TEST__;
    if (!harness) throw new Error('missing V3 E2E harness');
    return harness.consumeFrame(delta);
  }, deltaSeconds);
}

function parseCell(value: string | null): [number, number, number] {
  if (!value) throw new Error('missing cell telemetry');
  const cell = value.split(',').map(Number);
  if (cell.length !== 3 || cell.some((coordinate) => !Number.isInteger(coordinate))) {
    throw new Error(`invalid cell telemetry: ${value}`);
  }
  return cell as [number, number, number];
}

test('desktop V3 one key press turns once and held key does not keep rotating', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await startGame(page, 'v3-keyboard');
  await enableManualClock(page);

  const app = page.locator('#app');
  const before = parseCell(await app.getAttribute('data-head-cell'));
  await expect(app).toHaveAttribute('data-head-direction', '+Z');

  await page.keyboard.down('d');
  await expect(app).toHaveAttribute('data-pending-turn', 'right');
  expect(await consumeFrame(page, 1 / 6)).toBe(1);
  await expect(app).toHaveAttribute('data-head-direction', '-X');
  await expect(app).toHaveAttribute('data-pending-turn', 'none');

  const afterTurn = parseCell(await app.getAttribute('data-head-cell'));
  expect(afterTurn).toEqual([(before[0] + 8) % 9, before[1], before[2]]);

  expect(await consumeFrame(page, 1 / 6)).toBe(1);
  await expect(app).toHaveAttribute('data-head-direction', '-X');
  const afterHeldStep = parseCell(await app.getAttribute('data-head-cell'));
  expect(afterHeldStep).toEqual([(afterTurn[0] + 8) % 9, afterTurn[1], afterTurn[2]]);

  await page.keyboard.up('d');
});

test('desktop V3 latest pre-step turn wins and catch-up consumes it only on the first owed step', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await startGame(page, 'v3-latest-wins');
  await enableManualClock(page);

  const app = page.locator('#app');
  const before = parseCell(await app.getAttribute('data-head-cell'));

  // Prime half a strategic step without moving. The next 0.25 s frame then owes two steps
  // under the browser clock's production MAX_FRAME_DELTA_SECONDS clamp.
  expect(await consumeFrame(page, 1 / 12)).toBe(0);
  await page.keyboard.press('d');
  await page.keyboard.press('w');
  await expect(app).toHaveAttribute('data-pending-turn', 'up');

  expect(await consumeFrame(page, 0.25)).toBe(2);
  await expect(app).toHaveAttribute('data-pending-turn', 'none');
  await expect(app).toHaveAttribute('data-head-direction', '+Y');

  const after = parseCell(await app.getAttribute('data-head-cell'));
  expect(after).toEqual([before[0], (before[1] + 2) % 9, before[2]]);
});
