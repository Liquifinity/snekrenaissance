import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GRID_CONFIG } from '../../src/game/grid-config';
import { createRun, queueTurn, startRun, stepRun } from '../../src/game/run-state';
import { FixedStepClock } from '../../src/game/simulation';
import { snakeHead } from '../../src/game/snake';

const source = readFileSync(new URL('../../src/main.ts', import.meta.url), 'utf8');
const stableRng = () => 0.75;

describe('browser main loop V3 authority', () => {
  it('wires keyboard turn events directly into the active run pendingTurn', () => {
    expect(source).toContain('queueTurn');
    expect(source).toContain('onTurnIntent:');
    expect(source).toMatch(/run\.phase === ['"]playing['"]/);
    expect(source).toMatch(/queueTurn\(run, intent\)/);
    expect(source).not.toContain('keyboard.state');
  });

  it('keeps camera toggle separate from strategic turn events', () => {
    expect(source).toContain('onCameraToggle: toggleCamera');
  });

  it('applies only the latest keyboard-equivalent intent before a step', () => {
    const run = startRun(createRun(stableRng));
    run.food = { x: 0, y: 0, z: 0 };
    queueTurn(run, 'right');
    queueTurn(run, 'up');
    stepRun(run, stableRng);

    expect(run.frame.forward).toBe('+Y');
    expect(snakeHead(run.snake).cell).toEqual({ x: 4, y: 5, z: 4 });
    expect(run.pendingTurn).toBe('none');
  });

  it('configures the browser locomotion clock from the six-steps-per-second GridConfig', () => {
    expect(source).toContain('new FixedStepClock(1 / GRID_CONFIG.stepsPerSecond');
    expect(source).not.toContain('new FixedStepClock();');
    expect(source).not.toContain('readSteeringInput');
    expect(source).not.toContain('inputYaw');
    expect(source).not.toContain('inputPitch');
  });

  it('consumes one buffered turn only on the first step of a three-step catch-up', () => {
    const run = startRun(createRun(stableRng));
    run.food = { x: 0, y: 0, z: 0 };
    const stepSeconds = 1 / GRID_CONFIG.stepsPerSecond;
    const clock = new FixedStepClock(stepSeconds, 1, 8);
    const heads: Array<{ x: number; y: number; z: number }> = [];

    queueTurn(run, 'right');
    const steps = clock.consume(stepSeconds * 3, () => {
      stepRun(run, stableRng);
      heads.push({ ...snakeHead(run.snake).cell });
    });

    expect(steps).toBe(3);
    expect(heads).toEqual([
      { x: 3, y: 4, z: 4 },
      { x: 2, y: 4, z: 4 },
      { x: 1, y: 4, z: 4 }
    ]);
    expect(run.frame.forward).toBe('-X');
    expect(run.pendingTurn).toBe('none');
  });

  it('uses joystick sectors only for turn events and analog coordinates only for knob presentation', () => {
    expect(source).toContain('const joystick = new JoystickInput({');
    expect(source).toContain('joystick.visualVector');
    expect(source).not.toContain('joystick.state');
  });

  it('builds chase-camera guidance only from the active grid run', () => {
    expect(source).toContain('buildPixelChaseCameraSnapshot(run)');
    expect(source).not.toContain('FlightPresentation');
    expect(source).not.toContain('interpolateFlightPresentation');
    expect(source).not.toContain('buildPresentation');
    expect(source).not.toContain('previousFlight');
    expect(source).not.toMatch(/run\.flight/);
    expect(source).not.toContain('visibleDirection');
  });
});
