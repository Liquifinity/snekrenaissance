import { expect, test, type Page } from '@playwright/test';

async function startGame(page: Page, username: string): Promise<void> {
  await page.goto('/');
  await page.locator('[data-action="continue"]').click();
  await page.locator('input[name="username"]').fill(username);
  await page.locator('[data-action="play"]').click();
  await expect(page.locator('[data-hud-score]')).toHaveText('SCORE 0');
  await expect(page.locator('#game-canvas')).toBeVisible();
}

type MotionSample = {
  cell: string;
  renderWorld: string;
  point: string;
  yaw: number;
  pitch: number;
};

async function sampleAnimationFrames(page: Page, frameCount: number): Promise<MotionSample[]> {
  return page.evaluate((count) => new Promise<MotionSample[]>((resolve, reject) => {
    const samples: MotionSample[] = [];

    const capture = () => {
      const app = document.querySelector<HTMLElement>('#app');
      if (!app) {
        reject(new Error('missing app'));
        return;
      }
      const cell = app.dataset.headCell;
      const renderWorld = app.dataset.headRenderWorld;
      const point = app.dataset.headPoint;
      if (!cell || !renderWorld || !point) {
        requestAnimationFrame(capture);
        return;
      }

      samples.push({
        cell,
        renderWorld,
        point,
        yaw: Number(app.dataset.headYaw),
        pitch: Number(app.dataset.headPitch)
      });

      if (samples.length >= count) {
        resolve(samples);
      } else {
        requestAnimationFrame(capture);
      }
    };

    requestAnimationFrame(capture);
  }), frameCount);
}

function parseTriplet(value: string): [number, number, number] {
  const values = value.split(',').map(Number);
  if (values.length !== 3 || values.some((entry) => !Number.isFinite(entry))) {
    throw new Error(`invalid triplet: ${value}`);
  }
  return [values[0], values[1], values[2]];
}

function expectOnBaselineLattice(value: string): void {
  for (const coordinate of parseTriplet(value)) {
    const latticeIndex = (coordinate + 1.6) / 0.4;
    expect(Math.abs(latticeIndex - Math.round(latticeIndex))).toBeLessThan(1e-8);
  }
}

test('desktop V2.2 keeps visible head snapped while continuous flight advances between cell entries', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await startGame(page, 'pixel-motion-desktop');

  const samples = await sampleAnimationFrames(page, 24);
  expect(new Set(samples.map((sample) => sample.cell)).size).toBeGreaterThanOrEqual(2);

  for (const sample of samples) expectOnBaselineLattice(sample.renderWorld);

  const sameCellPairs = samples.slice(1).filter((sample, index) => sample.cell === samples[index].cell);
  expect(sameCellPairs.length).toBeGreaterThan(0);

  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];
    if (current.cell === previous.cell) {
      expect(current.renderWorld).toBe(previous.renderWorld);
    }
  }

  const continuousInsideCell = samples.slice(1).some((current, index) => {
    const previous = samples[index];
    return current.cell === previous.cell
      && current.renderWorld === previous.renderWorld
      && current.point !== previous.point;
  });
  expect(continuousInsideCell).toBe(true);
});

test('desktop V2.2 held steering changes continuous yaw while visible positions remain lattice-snapped', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await startGame(page, 'pixel-steering-desktop');

  await page.keyboard.down('ArrowRight');
  const samples = await sampleAnimationFrames(page, 18);
  await page.keyboard.up('ArrowRight');

  expect(samples.at(-1)?.yaw ?? 0).toBeGreaterThan(samples[0]?.yaw ?? 0);
  for (const sample of samples) expectOnBaselineLattice(sample.renderWorld);
});

test('mobile V2.2 joystick remains continuous while visible head stays lattice-snapped', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile-'));
  await startGame(page, `pixel-motion-${testInfo.project.name}`);

  const joystick = page.locator('[data-joystick]');
  const box = await joystick.boundingBox();
  if (!box) throw new Error('missing joystick box');
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  const rightX = box.x + box.width - 4;
  const pointerId = 23;

  await joystick.dispatchEvent('pointerdown', { pointerId, clientX: centerX, clientY: centerY });
  await joystick.dispatchEvent('pointermove', { pointerId, clientX: rightX, clientY: centerY });
  await expect.poll(async () => Number(await page.locator('#app').getAttribute('data-input-yaw'))).toBeGreaterThan(0.5);

  const samples = await sampleAnimationFrames(page, 18);
  for (const sample of samples) expectOnBaselineLattice(sample.renderWorld);
  expect(samples.at(-1)?.yaw ?? 0).toBeGreaterThan(samples[0]?.yaw ?? 0);

  await joystick.dispatchEvent('pointermove', { pointerId, clientX: centerX, clientY: centerY });
  await expect.poll(async () => Math.abs(Number(await page.locator('#app').getAttribute('data-input-yaw')))).toBeLessThan(0.01);
  await joystick.dispatchEvent('pointermove', { pointerId, clientX: box.x + 4, clientY: centerY });
  await expect.poll(async () => Number(await page.locator('#app').getAttribute('data-input-yaw'))).toBeLessThan(-0.5);
  await joystick.dispatchEvent('pointerup', { pointerId, clientX: centerX, clientY: centerY });
});
