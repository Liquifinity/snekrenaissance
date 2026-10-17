import { describe, expect, it } from 'vitest';
import { FlightTrail } from '../../src/render/flight-trail';

describe('FlightTrail', () => {
  it('samples accumulated straight-line distance behind the newest point', () => {
    const trail = new FlightTrail();
    trail.reset([
      { x: 0, y: 0, z: 3 },
      { x: 0, y: 0, z: 2 },
      { x: 0, y: 0, z: 1 },
      { x: 0, y: 0, z: 0 }
    ]);

    expect(trail.sampleBehind(0)).toEqual({ x: 0, y: 0, z: 3 });
    expect(trail.sampleBehind(0.5)).toEqual({ x: 0, y: 0, z: 2.5 });
    expect(trail.sampleBehind(1.5)).toEqual({ x: 0, y: 0, z: 1.5 });
  });

  it('samples curved polylines by accumulated distance rather than endpoint distance', () => {
    const trail = new FlightTrail();
    trail.reset([
      { x: 1, y: 1, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 }
    ]);

    expect(trail.sampleBehind(1.5)).toEqual({ x: 0.5, y: 0, z: 0 });
  });

  it('uses a render head override instead of stepping forward through the fixed current head', () => {
    const trail = new FlightTrail();
    trail.reset([
      { x: 0, y: 0, z: 2 },
      { x: 0, y: 0, z: 1 },
      { x: 0, y: 0, z: 0 }
    ]);

    const override = { x: 0, y: 0, z: 1.5 };
    expect(trail.sampleBehind(0, override)).toEqual(override);
    expect(trail.sampleBehind(0.5, override)).toEqual({ x: 0, y: 0, z: 1 });
  });

  it('keeps toroidal crossing samples unwrapped internally', () => {
    const trail = new FlightTrail();
    trail.reset([
      { x: 9.1, y: 4.5, z: 4.5 },
      { x: 8.9, y: 4.5, z: 4.5 },
      { x: 8.7, y: 4.5, z: 4.5 }
    ]);

    expect(trail.sampleBehind(0.1).x).toBeCloseTo(9.0, 12);
    expect(trail.sampleBehind(0.3).x).toBeCloseTo(8.8, 12);
  });

  it('trims to a bounded distance while retaining an interpolated oldest endpoint', () => {
    const trail = new FlightTrail();
    trail.reset([
      { x: 0, y: 0, z: 3 },
      { x: 0, y: 0, z: 2 },
      { x: 0, y: 0, z: 1 },
      { x: 0, y: 0, z: 0 }
    ]);

    trail.trimToDistance(1.5);
    expect(trail.sampleBehind(3)).toEqual({ x: 0, y: 0, z: 1.5 });
  });

  it('pushes newest samples and rejects negative distances', () => {
    const trail = new FlightTrail();
    trail.reset([{ x: 0, y: 0, z: 0 }]);
    trail.push({ x: 0, y: 0, z: 1 });
    expect(trail.sampleBehind(0)).toEqual({ x: 0, y: 0, z: 1 });
    expect(() => trail.sampleBehind(-0.01)).toThrow(RangeError);
    expect(() => trail.trimToDistance(-1)).toThrow(RangeError);
  });
});
