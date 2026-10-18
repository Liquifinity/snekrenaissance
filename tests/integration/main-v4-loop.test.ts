import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GRID_CONFIG } from '../../src/game/grid-config';
import { createRun, queueDirection, startRun, stepRun } from '../../src/game/run-state';
import { FixedStepClock } from '../../src/game/simulation';
import { snakeHead } from '../../src/game/snake';

const source = readFileSync(new URL('../../src/main.ts', import.meta.url), 'utf8');
const stableRng = () => 0.75;

describe('browser main loop V4 board-space authority', () => {
  it('wires keyboard world directions directly into pendingDirection', () => {
    expect(source).toContain('queueDirection');
    expect(source).toContain('onDirection:');
    expect(source).toMatch(/run\.phase === ['"]playing['"]/);
    expect(source).toMatch(/queueDirection\(run, direction\)/);
    expect(source).not.toContain('queueTurn');
  });

  it('uses one board camera with no chase/overview toggle route', () => {
    expect(source).toContain('BoardCameraController');
    expect(source).toContain("app.dataset.cameraMode = 'board'");
    expect(source).not.toContain('ChaseCameraController');
    expect(source).not.toContain('toggleCamera');
    expect(source).not.toContain('dataCameraToggle');
  });

  it('applies only the latest valid absolute direction before a step', () => {
    const run = startRun(createRun(stableRng));
    run.food = { x: 0, y: 0, z: 0 };
    queueDirection(run, '+X');
    queueDirection(run, '+Y');
    stepRun(run, stableRng);
    expect(run.heading).toBe('+Y');
    expect(snakeHead(run.snake).cell).toEqual({ x: 4, y: 5, z: 4 });
    expect(run.pendingDirection).toBeNull();
  });

  it('configures the browser locomotion clock from the six-steps-per-second GridConfig', () => {
    expect(source).toContain('new FixedStepClock(1 / GRID_CONFIG.stepsPerSecond');
    expect(source).not.toContain('new FixedStepClock();');
  });

  it('consumes one buffered direction only on the first step of a three-step catch-up', () => {
    const run = startRun(createRun(stableRng));
    run.food = { x: 0, y: 0, z: 0 };
    const stepSeconds = 1 / GRID_CONFIG.stepsPerSecond;
    const clock = new FixedStepClock(stepSeconds, 1, 8);
    const heads: Array<{ x: number; y: number; z: number }> = [];
    queueDirection(run, '-X');
    const steps = clock.consume(stepSeconds * 3, () => {
      stepRun(run, stableRng);
      heads.push({ ...snakeHead(run.snake).cell });
    });
    expect(steps).toBe(3);
    expect(heads).toEqual([{ x: 3, y: 4, z: 4 }, { x: 2, y: 4, z: 4 }, { x: 1, y: 4, z: 4 }]);
    expect(run.heading).toBe('-X');
    expect(run.pendingDirection).toBeNull();
  });

  it('uses the six-button direction pad instead of analog joystick authority', () => {
    expect(source).toContain('createDirectionPad');
    expect(source).not.toContain('JoystickInput');
    expect(source).not.toContain('joystick.visualVector');
  });

  it('keeps camera authority independent from snake state and toroidal wrap', () => {
    expect(source).not.toContain('buildPixelChaseCameraSnapshot');
    expect(source).not.toContain('wrapRebase');
    expect(source).not.toContain('updateChaseCamera');
  });
});
