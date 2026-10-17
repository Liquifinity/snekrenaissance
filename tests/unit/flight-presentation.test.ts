import { describe, expect, it } from 'vitest';
import { forwardVector, type FlightPose } from '../../src/game/flight';
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
  const orientation = Object.freeze({ yaw, pitch, roll: 0 as const });
  return Object.freeze({
    unwrappedPosition: Object.freeze({ x, y, z }),
    wrappedPosition: Object.freeze({
      x: ((x % GRID_CONFIG.resolution) + GRID_CONFIG.resolution) % GRID_CONFIG.resolution,
      y: ((y % GRID_CONFIG.resolution) + GRID_CONFIG.resolution) % GRID_CONFIG.resolution,
      z: ((z % GRID_CONFIG.resolution) + GRID_CONFIG.resolution) % GRID_CONFIG.resolution
    }),
    orientation,
    forward: Object.freeze(forwardVector(orientation))
  });
}

describe('continuous flight presentation', () => {
  it('maps logical grid points directly to world presentation coordinates', () => {
    expect(displayWorldForGridPoint({ x: 4.5, y: 4.5, z: 4.5 })).toEqual({ x: 0, y: 0, z: 0 });
    expect(displayWorldForGridPoint({ x: 5.5, y: 4.5, z: 4.5 }).x).toBeCloseTo(0.4, 12);
  });

  it('interpolates fixed flight poses at alpha 0, 0.5 and 1', () => {
    const previous = pose(4.5, 4.5, 4.5);
    const current = pose(5.5, 4.5, 4.5);

    expect(interpolateFlightPresentation(previous, current, 0).unwrappedGridPoint.x).toBeCloseTo(4.5, 12);
    expect(interpolateFlightPresentation(previous, current, 0.5).unwrappedGridPoint.x).toBeCloseTo(5.0, 12);
    expect(interpolateFlightPresentation(previous, current, 1).unwrappedGridPoint.x).toBeCloseTo(5.5, 12);
  });

  it('derives continuous forward/up/quaternion from interpolated yaw and pitch', () => {
    const previous = pose(4.5, 4.5, 4.5, 0, 0);
    const current = pose(4.5, 4.5, 4.5, Math.PI / 2, Math.PI / 6);
    const presentation = interpolateFlightPresentation(previous, current, 1);

    expect(presentation.forwardWorld.x).toBeCloseTo(Math.cos(Math.PI / 6), 8);
    expect(presentation.forwardWorld.y).toBeCloseTo(0.5, 8);
    expect(presentation.forwardWorld.z).toBeCloseTo(0, 8);
    expect(Math.hypot(
      presentation.upWorld.x,
      presentation.upWorld.y,
      presentation.upWorld.z
    )).toBeCloseTo(1, 8);
    expect(Math.hypot(
      presentation.quaternion.x,
      presentation.quaternion.y,
      presentation.quaternion.z,
      presentation.quaternion.w
    )).toBeCloseTo(1, 8);
  });

  it('keeps wrap interpolation short in unwrapped space and exposes explicit display offset', () => {
    const previous = pose(8.9, 4.5, 4.5);
    const current = pose(9.1, 4.5, 4.5);
    const presentation = interpolateFlightPresentation(previous, current, 0.5);

    expect(presentation.unwrappedGridPoint.x).toBeCloseTo(9.0, 12);
    expect(presentation.headWorld.x).toBeCloseTo(1.8, 12);
    expect(presentation.displayWrapOffset.x).toBeCloseTo(-GRID_CONFIG.worldSize, 12);
    expect(presentation.displayedHeadWorld.x).toBeCloseTo(-1.8, 12);
  });

  it('clamps render alpha instead of extrapolating gameplay presentation', () => {
    const previous = pose(4.5, 4.5, 4.5);
    const current = pose(5.5, 4.5, 4.5);
    expect(interpolateFlightPresentation(previous, current, -1).unwrappedGridPoint.x).toBeCloseTo(4.5, 12);
    expect(interpolateFlightPresentation(previous, current, 2).unwrappedGridPoint.x).toBeCloseTo(5.5, 12);
  });
});
