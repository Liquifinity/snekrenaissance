import { describe, expect, it } from 'vitest';
import { GRID_CONFIG } from '../../src/game/grid-config';
import {
  FLIGHT_SPEED_CELLS_PER_SECOND,
  MAX_PITCH,
  STEERING_RATE,
  advanceFlightPose,
  applySteering,
  createInitialFlightPose,
  forwardVector,
  wrapGridPoint
} from '../../src/game/flight';

describe('continuous logical flight', () => {
  it('starts at the exact center of the logical head cell facing +Z', () => {
    const pose = createInitialFlightPose({ x: 4, y: 4, z: 4 });
    expect(pose.unwrappedPosition).toEqual({ x: 4.5, y: 4.5, z: 4.5 });
    expect(pose.wrappedPosition).toEqual({ x: 4.5, y: 4.5, z: 4.5 });
    expect(pose.orientation).toEqual({ yaw: 0, pitch: 0, roll: 0 });
    expect(pose.forward).toEqual({ x: 0, y: 0, z: 1 });
  });

  it('uses the approved steering and speed constants', () => {
    expect(STEERING_RATE).toBeCloseTo(Math.PI * 0.9, 12);
    expect(MAX_PITCH).toBeCloseTo(Math.PI * (80 / 180), 12);
    expect(FLIGHT_SPEED_CELLS_PER_SECOND).toBe(6);
  });

  it('integrates full and partial yaw proportionally while held', () => {
    const initial = { yaw: 0, pitch: 0, roll: 0 } as const;
    const half = applySteering(initial, { yaw: 0.5, pitch: 0 }, 0.25);
    expect(half.yaw).toBeCloseTo(STEERING_RATE * 0.5 * 0.25, 12);

    const held = applySteering(half, { yaw: 1, pitch: 0 }, 0.25);
    expect(held.yaw).toBeCloseTo(half.yaw + STEERING_RATE * 0.25, 12);
  });

  it('clamps pitch to ±80 degrees', () => {
    const initial = { yaw: 0, pitch: 0, roll: 0 } as const;
    expect(applySteering(initial, { yaw: 0, pitch: 1 }, 10).pitch).toBeCloseTo(MAX_PITCH, 12);
    expect(applySteering(initial, { yaw: 0, pitch: -1 }, 10).pitch).toBeCloseTo(-MAX_PITCH, 12);
  });

  it('neutral input preserves orientation and invalid dt is rejected', () => {
    const orientation = { yaw: 0.4, pitch: -0.2, roll: 0 } as const;
    expect(applySteering(orientation, { yaw: 0, pitch: 0 }, 1)).toEqual(orientation);
    expect(() => applySteering(orientation, { yaw: 0, pitch: 0 }, -0.01)).toThrow(RangeError);
    expect(() => applySteering(orientation, { yaw: 0, pitch: 0 }, Number.NaN)).toThrow(RangeError);
  });

  it('derives the continuous forward vector from yaw and pitch', () => {
    const forward = forwardVector({ yaw: Math.PI / 2, pitch: 0, roll: 0 });
    expect(forward.x).toBeCloseTo(1, 12);
    expect(forward.y).toBeCloseTo(0, 12);
    expect(forward.z).toBeCloseTo(0, 12);
  });

  it('wraps continuous logical points canonically on all axes', () => {
    expect(wrapGridPoint({ x: 9.25, y: -0.5, z: 18.75 }, 9)).toEqual({
      x: 0.25,
      y: 8.5,
      z: 0.75
    });
  });

  it('advances 0.1 logical cell per 60 Hz tick at neutral steering', () => {
    const pose = createInitialFlightPose({ x: 4, y: 4, z: 4 }, GRID_CONFIG);
    const next = advanceFlightPose(pose, { yaw: 0, pitch: 0 }, 1 / 60, GRID_CONFIG);
    expect(next.unwrappedPosition.x).toBeCloseTo(4.5, 12);
    expect(next.unwrappedPosition.y).toBeCloseTo(4.5, 12);
    expect(next.unwrappedPosition.z).toBeCloseTo(4.6, 12);
    expect(next.wrappedPosition.z).toBeCloseTo(4.6, 12);
  });

  it('steering affects orientation and trajectory on the same fixed tick', () => {
    const pose = createInitialFlightPose({ x: 4, y: 4, z: 4 });
    const next = advanceFlightPose(pose, { yaw: 1, pitch: 0 }, 1 / 60);
    expect(next.orientation.yaw).toBeGreaterThan(0);
    expect(next.forward.x).toBeGreaterThan(0);
    expect(next.unwrappedPosition.x).toBeGreaterThan(4.5);
  });
});
