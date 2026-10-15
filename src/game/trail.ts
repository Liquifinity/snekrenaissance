import type { Vec3 } from './types';

function cloneVec3(value: Vec3): Vec3 {
  return { x: value.x, y: value.y, z: value.z };
}

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
}

export class TrailBuffer {
  private readonly samples: Vec3[];

  constructor(initial: Vec3) {
    this.samples = [cloneVec3(initial)];
  }

  push(position: Vec3): void {
    this.samples.push(cloneVec3(position));
  }

  get length(): number {
    return this.samples.length;
  }

  get oldest(): Vec3 {
    return cloneVec3(this.samples[0]);
  }

  get newest(): Vec3 {
    return cloneVec3(this.samples[this.samples.length - 1]);
  }

  sampleFromNewest(distanceBehind: number): Vec3 {
    if (!Number.isFinite(distanceBehind) || distanceBehind < 0) {
      throw new RangeError('Trail sample distance must be a finite non-negative number.');
    }

    if (distanceBehind === 0) {
      return this.newest;
    }

    let remaining = distanceBehind;

    for (let i = this.samples.length - 1; i > 0; i -= 1) {
      const newer = this.samples[i];
      const older = this.samples[i - 1];
      const segmentLength = distance(older, newer);

      if (segmentLength === 0) {
        continue;
      }

      if (remaining <= segmentLength) {
        const t = remaining / segmentLength;
        return {
          x: newer.x + (older.x - newer.x) * t,
          y: newer.y + (older.y - newer.y) * t,
          z: newer.z + (older.z - newer.z) * t
        };
      }

      remaining -= segmentLength;
    }

    return this.oldest;
  }
}

export function sampleTrailAtDistance(trail: TrailBuffer, distanceBehind: number): Vec3 {
  return trail.sampleFromNewest(distanceBehind);
}
