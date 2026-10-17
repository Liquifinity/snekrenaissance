import { describe, expect, it } from 'vitest';
import type { FlightPose } from '../../src/game/flight';
import { GRID_CONFIG } from '../../src/game/grid-config';
import {
  displayWorldForGridPoint,
  interpolateFlightPresentation
} from '../../src/render/flight-presentation';

function pose(
  x: number,
  y: number,
  z: number,
  yaw = 0,
  pitch = 0
): FlightPose {
  return {
    unwrappedPosition: { x, y, z },
    wrappedPosition: {
      x: ((x % GRID_CONFIG.resolution) + GRID_CONFIG.resolution) % GRID_CONFIG.resolution,
      y: ((y % GRID_CONFIG.resolution) + GRID_CONFIG.resolution) % GRID_CONFIG.resolution,
      z: ((z % GRID_CONFIG.resolution) + GRID_CONFIG.resolution) % GRID_CONFIG.resolution
    },
    orientation: { yaw, pitch, roll: 0 },
    forward: { x: Math.sin(yaw) * Math.cos(pitch), y: Math.sin(pitch), z: Math.cos(yaw) * Math.cos(pitch) }
  };
}

describe('continuous flight presentation', () => {
  it.each([
    [0, 4.5],
    [0.5, 5],
    [1, 5.5]
  ])('interpolates unwrapped logical position at alpha=%s', (alpha, expectedX) => {
    const presentation = interpolateFlightPresentation(
      pose(4.5, 4.5, 4.5),
      pose(5.5, 4.5, 4.5),
      alpha
    );
    expect(presentation.unwrappedGridPoint.x).toBeCloseTo(expectedX, 12);
  });

  it('derives forward/up/quaternion from interpolated continuous yaw and pitch', () => {
    const presentation = interpolateFlightPresentation(
      pose(4.5, 4.5, 4.5, 0, 0),
      pose(4.5, 4.5, 4.5, Math.PI / 2, 0),
      0.5
    );

    expect(presentation.forwardWorld.x).toBeCloseTo(Math.SQRT1_2, 10);
    expect(presentation.forwardWorld.y).toBeCloseTo(0, 10);
    expect(presentation.forwardWorld.z).toBeCloseTo(Math.SQRT1_2, 10);
    expect(presentation.upWorld.x).toBeCloseTo(0, 10);
    expect(presentation.upWorld.y).toBeCloseTo(1, 10);
    expect(presentation.upWorld.z).toBeCloseTo(0, 10);
    const qNorm = Math.hypot(
      presentation.quaternion.x,
      presentation.quaternion.y,
      presentation.quaternion.z,
      presentation.quaternion.w
    );
    expect(qNorm).toBeCloseTo(1, 10);
  });

  it('interpolates across N→0 wrap in short unwrapped space', () => {
    const presentation = interpolateFlightPresentation(
      pose(8.9, 4.5, 4.5),
      pose(9.1, 4.5, 4.5),
      0.5
    );
    expect(presentation.unwrappedGridPoint.x).toBeCloseTo(9, 12);
    expect(presentation.headWorld.x).toBeCloseTo(GRID_CONFIG.worldSize / 2, 12);
    expect(Math.abs(presentation.displayWrapOffset.x)).toBeCloseTo(GRID_CONFIG.worldSize, 12);
    expect(Math.abs(presentation.displayedHeadWorld.x)).toBeCloseTo(GRID_CONFIG.worldSize / 2, 12);
  });

  it('canonicalizes display world separately from unwrapped world', () => {
    const displayed = displayWorldForGridPoint({ x: 9.25, y: 4.5, z: 4.5 });
    expect(displayed.x).toBeCloseTo(-1.7, 12);
    expect(displayed.y).toBeCloseTo(0, 12);
    expect(displayed.z).toBeCloseTo(0, 12);
  });

  it('clamps non-finite/overshoot alpha to a safe endpoint', () => {
    const previous = pose(4.5, 4.5, 4.5);
    const current = pose(5.5, 4.5, 4.5);
    expect(interpolateFlightPresentation(previous, current, -1).unwrappedGridPoint.x).toBeCloseTo(4.5, 12);
    expect(interpolateFlightPresentation(previous, current, 2).unwrappedGridPoint.x).toBeCloseTo(5.5, 12);
    expect(interpolateFlightPresentation(previous, current, Number.NaN).unwrappedGridPoint.x).toBeCloseTo(5.5, 12);
  });
});
