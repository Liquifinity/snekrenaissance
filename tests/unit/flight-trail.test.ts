import { describe, expect, it } from 'vitest';
import { FlightTrail } from '../../src/render/flight-trail';

describe('FlightTrail render-only polyline', () => {
  it('samples straight accumulated distance behind the newest point', () => {
    const trail = new FlightTrail();
    trail.reset([
      { x: 3, y: 0, z: 0 },
      { x: 2, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 }
    ]);

    expect(trail.sampleBehind(0)).toEqual({ x: 3, y: 0, z: 0 });
    expect(trail.sampleBehind(0.5)).toEqual({ x: 2.5, y: 0, z: 0 });
    expect(trail.sampleBehind(2.25)).toEqual({ x: 0.75, y: 0, z: 0 });
  });

  it('samples by curved polyline distance rather than endpoint distance', () => {
    const trail = new FlightTrail();
    trail.reset([
      { x: 1, y: 1, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 }
    ]);

    expect(trail.sampleBehind(1.5)).toEqual({ x: 0.5, y: 0, z: 0 });
  });

  it('accepts the six initial strategic centers newest-to-oldest without remapping them', () => {
    const initial = [
      { x: 4.5, y: 4.5, z: 4.5 },
      { x: 4.5, y: 4.5, z: 3.5 },
      { x: 4.5, y: 4.5, z: 2.5 },
      { x: 4.5, y: 4.5, z: 1.5 },
      { x: 4.5, y: 4.5, z: 0.5 },
      { x: 4.5, y: 4.5, z: -0.5 }
    ];
    const trail = new FlightTrail();
    trail.reset(initial);

    for (let index = 0; index < initial.length; index += 1) {
      expect(trail.sampleBehind(index)).toEqual(initial[index]);
    }
  });

  it('uses a head override as the leading point without mutating stored history', () => {
    const trail = new FlightTrail();
    trail.reset([
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 }
    ]);

    expect(trail.sampleBehind(0, { x: 1.5, y: 0, z: 0 })).toEqual({ x: 1.5, y: 0, z: 0 });
    expect(trail.sampleBehind(0.25, { x: 1.5, y: 0, z: 0 })).toEqual({ x: 1.25, y: 0, z: 0 });
    expect(trail.sampleBehind(0)).toEqual({ x: 1, y: 0, z: 0 });
  });

  it('trims to an exact retained polyline distance and clamps samples at the oldest retained point', () => {
    const trail = new FlightTrail();
    trail.reset([
      { x: 4, y: 0, z: 0 },
      { x: 3, y: 0, z: 0 },
      { x: 2, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 }
    ]);
    trail.trimToDistance(2.5);

    expect(trail.sampleBehind(2.5)).toEqual({ x: 1.5, y: 0, z: 0 });
    expect(trail.sampleBehind(10)).toEqual({ x: 1.5, y: 0, z: 0 });
  });

  it('keeps unwrapped points intact across toroidal boundaries', () => {
    const trail = new FlightTrail();
    trail.reset([
      { x: 9.2, y: 4.5, z: 4.5 },
      { x: 8.8, y: 4.5, z: 4.5 }
    ]);

    expect(trail.sampleBehind(0.2).x).toBeCloseTo(9.0, 12);
  });

  it('rejects negative distance and sampling an empty trail', () => {
    const trail = new FlightTrail();
    expect(() => trail.sampleBehind(0)).toThrow(RangeError);
    trail.reset([{ x: 0, y: 0, z: 0 }]);
    expect(() => trail.sampleBehind(-0.1)).toThrow(RangeError);
    expect(() => trail.trimToDistance(-1)).toThrow(RangeError);
  });
});
