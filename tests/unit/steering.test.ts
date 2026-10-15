import { describe, expect, it } from 'vitest';
import {
  applySteering,
  createInitialOrientation,
  forwardVector,
  type SteeringInput
} from '../../src/game/steering';

const DT = 0.25;

describe('continuous 3D steering', () => {
  it('neutral input preserves orientation', () => {
    const initial = createInitialOrientation();
    const next = applySteering(initial, { yaw: 0, pitch: 0 }, DT);
    expect(next).toEqual(initial);
  });

  it('left and right produce opposite yaw directions', () => {
    const initial = createInitialOrientation();
    const left = forwardVector(applySteering(initial, { yaw: -1, pitch: 0 }, DT));
    const right = forwardVector(applySteering(initial, { yaw: 1, pitch: 0 }, DT));
    expect(left.x).toBeCloseTo(-right.x, 6);
    expect(left.z).toBeCloseTo(right.z, 6);
  });

  it('up and down produce opposite pitch directions', () => {
    const initial = createInitialOrientation();
    const up = forwardVector(applySteering(initial, { yaw: 0, pitch: 1 }, DT));
    const down = forwardVector(applySteering(initial, { yaw: 0, pitch: -1 }, DT));
    expect(up.y).toBeCloseTo(-down.y, 6);
    expect(up.z).toBeCloseTo(down.z, 6);
  });

  it('keeps the forward vector normalized after combined steering', () => {
    const input: SteeringInput = { yaw: 0.73, pitch: -0.61 };
    const forward = forwardVector(applySteering(createInitialOrientation(), input, 1.75));
    const length = Math.hypot(forward.x, forward.y, forward.z);
    expect(length).toBeCloseTo(1, 8);
  });

  it('never introduces player-controlled roll', () => {
    const next = applySteering(createInitialOrientation(), { yaw: 1, pitch: 1 }, 0.5);
    expect(next.roll).toBe(0);
  });
});
