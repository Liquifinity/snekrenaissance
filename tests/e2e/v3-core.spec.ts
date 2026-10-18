import { expect, test, type Page } from '@playwright/test';

type Cell = { x: number; y: number; z: number };
type Vec3 = { x: number; y: number; z: number };
type StrategicSample = { cell: string; direction: string; up: string };

type V3Harness = {
  setManualClock: (enabled: boolean) => void;
  consumeFrame: (frameDeltaSeconds: number) => number;
  setFoodCell: (cell: Cell) => void;
  getCameraPosition: () => Vec3;
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

async function setFoodCell(page: Page, cell: Cell): Promise<void> {
  await page.evaluate((target) => {
    const harness = (window as unknown as { __SNEK_TEST__?: V3Harness }).__SNEK_TEST__;
    if (!harness) throw new Error('missing V3 E2E harness');
    harness.setFoodCell(target);
  }, cell);
}

function parseCell(value: string | null): Cell {
  if (!value) throw new Error('missing cell telemetry');
  const coordinates = value.split(',').map(Number);
  if (coordinates.length !== 3 || coordinates.some((coordinate) => !Number.isInteger(coordinate))) {
    throw new Error(`invalid cell telemetry: ${value}`);
  }
  return { x: coordinates[0], y: coordinates[1], z: coordinates[2] };
}

function parseVec3(value: string | null): Vec3 {
  if (!value) throw new Error('missing vector telemetry');
  const coordinates = value.split(',').map(Number);
  if (coordinates.length !== 3 || coordinates.some((coordinate) => !Number.isFinite(coordinate))) {
    throw new Error(`invalid vector telemetry: ${value}`);
  }
  return { x: coordinates[0], y: coordinates[1], z: coordinates[2] };
}

function nextCell(cell: Cell, direction: string, resolution = 9): Cell {
  const wrap = (value: number) => (value + resolution) % resolution;
  if (direction === '+X') return { ...cell, x: wrap(cell.x + 1) };
  if (direction === '-X') return { ...cell, x: wrap(cell.x - 1) };
  if (direction === '+Y') return { ...cell, y: wrap(cell.y + 1) };
  if (direction === '-Y') return { ...cell, y: wrap(cell.y - 1) };
  if (direction === '+Z') return { ...cell, z: wrap(cell.z + 1) };
  if (direction === '-Z') return { ...cell, z: wrap(cell.z - 1) };
  throw new Error(`unknown direction ${direction}`);
}

function toroidalAxisDistance(a: number, b: number, resolution = 9): number {
  const direct = Math.abs(a - b);
  return Math.min(direct, resolution - direct);
}

function expectFaceAdjacent(from: Cell, to: Cell): void {
  const distances = [
    toroidalAxisDistance(from.x, to.x),
    toroidalAxisDistance(from.y, to.y),
    toroidalAxisDistance(from.z, to.z)
  ];
  expect(distances.filter((distance) => distance === 1)).toHaveLength(1);
  expect(distances.filter((distance) => distance !== 0)).toHaveLength(1);
}

function expectWorldAtCell(world: Vec3, cell: Cell): void {
  const expected = {
    x: (cell.x + 0.5) * 0.4 - 1.8,
    y: (cell.y + 0.5) * 0.4 - 1.8,
    z: (cell.z + 0.5) * 0.4 - 1.8
  };
  expect(world.x).toBeCloseTo(expected.x, 10);
  expect(world.y).toBeCloseTo(expected.y, 10);
  expect(world.z).toBeCloseTo(expected.z, 10);
}

async function placeFoodOffInitialForwardPath(page: Page): Promise<void> {
  const head = parseCell(await page.locator('#app').getAttribute('data-head-cell'));
  await setFoodCell(page, { x: (head.x + 1) % 9, y: head.y, z: head.z });
}

async function captureStrategicSample(page: Page): Promise<StrategicSample> {
  const app = page.locator('#app');
  const cell = await app.getAttribute('data-head-cell');
  const direction = await app.getAttribute('data-head-direction');
  const up = await app.getAttribute('data-head-up');
  if (!cell || !direction || !up) throw new Error('missing strategic telemetry');
  return { cell, direction, up };
}

async function runCameraIndependentSchedule(
  page: Page,
  mode: 'chase' | 'overview',
  username: string
): Promise<StrategicSample[]> {
  await startGame(page, username);
  await enableManualClock(page);
  await placeFoodOffInitialForwardPath(page);
  const app = page.locator('#app');

  if (mode === 'overview') {
    await page.locator('[data-camera-toggle]').click();
    await expect(app).toHaveAttribute('data-camera-mode', 'overview');
  } else {
    await expect(app).toHaveAttribute('data-camera-mode', 'chase');
  }

  const samples: StrategicSample[] = [await captureStrategicSample(page)];
  expect(await consumeFrame(page, 1 / 6)).toBe(1);
  samples.push(await captureStrategicSample(page));

  await page.keyboard.press('d');
  expect(await consumeFrame(page, 1 / 6)).toBe(1);
  samples.push(await captureStrategicSample(page));

  expect(await consumeFrame(page, 1 / 6)).toBe(1);
  samples.push(await captureStrategicSample(page));

  await page.keyboard.press('w');
  expect(await consumeFrame(page, 1 / 6)).toBe(1);
  samples.push(await captureStrategicSample(page));

  return samples;
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
  expect(afterTurn).toEqual({ x: (before.x + 8) % 9, y: before.y, z: before.z });

  expect(await consumeFrame(page, 1 / 6)).toBe(1);
  await expect(app).toHaveAttribute('data-head-direction', '-X');
  const afterHeldStep = parseCell(await app.getAttribute('data-head-cell'));
  expect(afterHeldStep).toEqual({ x: (afterTurn.x + 8) % 9, y: afterTurn.y, z: afterTurn.z });

  await page.keyboard.up('d');
});

test('desktop V3 latest pre-step turn wins and catch-up consumes it only on the first owed step', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await startGame(page, 'v3-latest-wins');
  await enableManualClock(page);

  const app = page.locator('#app');
  const before = parseCell(await app.getAttribute('data-head-cell'));

  expect(await consumeFrame(page, 1 / 12)).toBe(0);
  await page.keyboard.press('d');
  await page.keyboard.press('w');
  await expect(app).toHaveAttribute('data-pending-turn', 'up');

  expect(await consumeFrame(page, 0.25)).toBe(2);
  await expect(app).toHaveAttribute('data-pending-turn', 'none');
  await expect(app).toHaveAttribute('data-head-direction', '+Y');

  const after = parseCell(await app.getAttribute('data-head-cell'));
  expect(after).toEqual({ x: before.x, y: (before.y + 2) % 9, z: before.z });
});

test('desktop V3 commits only face-adjacent lattice centers and wraps one axis atomically', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await startGame(page, 'v3-lattice-wrap');
  await enableManualClock(page);
  await placeFoodOffInitialForwardPath(page);

  const app = page.locator('#app');
  let previous = parseCell(await app.getAttribute('data-head-cell'));
  let sawWrap = false;

  for (let step = 0; step < 12; step += 1) {
    expect(await consumeFrame(page, 1 / 6)).toBe(1);
    const current = parseCell(await app.getAttribute('data-head-cell'));
    expectFaceAdjacent(previous, current);
    if (
      Math.abs(current.x - previous.x) > 1
      || Math.abs(current.y - previous.y) > 1
      || Math.abs(current.z - previous.z) > 1
    ) sawWrap = true;
    expectWorldAtCell(parseVec3(await app.getAttribute('data-head-render-world')), current);
    previous = current;
  }

  expect(sawWrap).toBe(true);
  await expect(app).toHaveAttribute('data-head-direction', '+Z');
});

test('desktop V3 pickup occurs at the exact committed cell/world center', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await startGame(page, 'v3-pickup');
  await enableManualClock(page);

  const app = page.locator('#app');
  const current = parseCell(await app.getAttribute('data-head-cell'));
  const direction = await app.getAttribute('data-head-direction');
  if (!direction) throw new Error('missing head direction');
  const target = nextCell(current, direction);
  await setFoodCell(page, target);

  expect(await consumeFrame(page, 1 / 6)).toBe(1);
  await expect(page.locator('[data-hud-score]')).toHaveText('SCORE 1');
  await expect(app).toHaveAttribute('data-last-food-pickup-cell', `${target.x},${target.y},${target.z}`);

  const foodWorld = parseVec3(await app.getAttribute('data-last-food-pickup-world'));
  const pickupHeadWorld = parseVec3(await app.getAttribute('data-last-food-pickup-head-world'));
  const renderedHeadWorld = parseVec3(await app.getAttribute('data-head-render-world'));
  expect(pickupHeadWorld).toEqual(foodWorld);
  expect(renderedHeadWorld).toEqual(foodWorld);
  expectWorldAtCell(foodWorld, target);
});

test('camera mode cannot change the strategic V3 sequence', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  const chase = await runCameraIndependentSchedule(page, 'chase', 'v3-camera-chase');
  const overview = await runCameraIndependentSchedule(page, 'overview', 'v3-camera-overview');
  expect(overview).toEqual(chase);
});

test('chase camera keeps smoothing while the strategic cell is frozen', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await startGame(page, 'v3-camera-smooth');
  await enableManualClock(page);
  await placeFoodOffInitialForwardPath(page);

  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
  await page.keyboard.press('d');
  expect(await consumeFrame(page, 1 / 6)).toBe(1);
  const committedCell = await page.locator('#app').getAttribute('data-head-cell');

  const samples = await page.evaluate(() => new Promise<Array<{ cell: string | null; camera: Vec3 }>>((resolve, reject) => {
    const harness = (window as unknown as { __SNEK_TEST__?: V3Harness }).__SNEK_TEST__;
    if (!harness) {
      reject(new Error('missing V3 E2E harness'));
      return;
    }
    const values: Array<{ cell: string | null; camera: Vec3 }> = [];
    const capture = () => {
      values.push({
        cell: document.querySelector('#app')?.getAttribute('data-head-cell') ?? null,
        camera: harness.getCameraPosition()
      });
      if (values.length >= 8) resolve(values);
      else requestAnimationFrame(capture);
    };
    requestAnimationFrame(capture);
  }));

  expect(samples.every((sample) => sample.cell === committedCell)).toBe(true);
  const uniqueCameraPositions = new Set(samples.map((sample) => JSON.stringify(sample.camera)));
  expect(uniqueCameraPositions.size).toBeGreaterThan(1);
});

test('mobile V3 joystick emits sector transitions once and respects the 10-degree hysteresis band', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile-'));
  await startGame(page, `v3-joystick-${testInfo.project.name}`);
  await enableManualClock(page);

  const app = page.locator('#app');
  const joystick = page.locator('[data-joystick]');
  const box = await joystick.boundingBox();
  if (!box) throw new Error('missing joystick box');
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  const radius = Math.min(box.width, box.height) / 2;
  const pointerId = 23;
  const pointAt = (degrees: number) => {
    const radians = degrees * Math.PI / 180;
    return {
      pointerId,
      clientX: centerX + Math.cos(radians) * radius * 0.8,
      clientY: centerY - Math.sin(radians) * radius * 0.8
    };
  };

  await joystick.dispatchEvent('pointerdown', { pointerId, clientX: centerX, clientY: centerY });
  await joystick.dispatchEvent('pointermove', pointAt(0));
  await expect(app).toHaveAttribute('data-joystick-sector', 'right');
  await expect(app).toHaveAttribute('data-pending-turn', 'right');

  expect(await consumeFrame(page, 1 / 6)).toBe(1);
  await expect(app).toHaveAttribute('data-head-direction', '-X');
  await expect(app).toHaveAttribute('data-pending-turn', 'none');

  await joystick.dispatchEvent('pointermove', pointAt(0));
  await expect(app).toHaveAttribute('data-pending-turn', 'none');
  expect(await consumeFrame(page, 1 / 6)).toBe(1);
  await expect(app).toHaveAttribute('data-head-direction', '-X');

  for (const angle of [50, 52, 54, 55]) {
    await joystick.dispatchEvent('pointermove', pointAt(angle));
    await expect(app).toHaveAttribute('data-joystick-sector', 'right');
    await expect(app).toHaveAttribute('data-pending-turn', 'none');
  }

  await joystick.dispatchEvent('pointermove', pointAt(56));
  await expect(app).toHaveAttribute('data-joystick-sector', 'up');
  await expect(app).toHaveAttribute('data-pending-turn', 'up');
  expect(await consumeFrame(page, 1 / 6)).toBe(1);
  await expect(app).toHaveAttribute('data-head-direction', '+Y');
  await expect(app).toHaveAttribute('data-pending-turn', 'none');

  await page.evaluate(() => window.dispatchEvent(new Event('orientationchange')));
  await expect(app).toHaveAttribute('data-joystick-sector', 'neutral');
});
