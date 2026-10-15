import type { Vec3 } from './types';

function cloneVec3(value: Vec3): Vec3 {
  return { x: value.x, y: value.y, z: value.z };
}

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
}

function interpolateFromNewer(newer: Vec3, older: Vec3, distanceFromNewer: number, segmentLength: number): Vec3 {
  const t = segmentLength === 0 ? 0 : distanceFromNewer / segmentLength;
  return {
    x: newer.x + (older.x - newer.x) * t,
    y: newer.y + (older.y - newer.y) * t,
    z: newer.z + (older.z - newer.z) * t
  };
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
    return this.sampleManyFromNewest([distanceBehind])[0];
  }

  sampleManyFromNewest(distancesBehind: readonly number[]): Vec3[] {
    if (distancesBehind.length === 0) return [];

    let previous = -Infinity;
    for (const distanceBehind of distancesBehind) {
      if (!Number.isFinite(distanceBehind) || distanceBehind < 0) {
        throw new RangeError('Trail sample distance must be a finite non-negative number.');
      }
      if (distanceBehind < previous) {
        throw new RangeError('Trail batch sample distances must be sorted ascending.');
      }
      previous = distanceBehind;
    }

    const result: Vec3[] = new Array(distancesBehind.length);
    let targetIndex = 0;

    while (targetIndex < distancesBehind.length && distancesBehind[targetIndex] === 0) {
      result[targetIndex] = this.newest;
      targetIndex += 1;
    }

    let traversed = 0;

    for (let sampleIndex = this.samples.length - 1; sampleIndex > 0 && targetIndex < distancesBehind.length; sampleIndex -= 1) {
      const newer = this.samples[sampleIndex];
      const older = this.samples[sampleIndex - 1];
      const segmentLength = distance(older, newer);
      if (segmentLength === 0) continue;

      const segmentEnd = traversed + segmentLength;
      while (
        targetIndex < distancesBehind.length &&
        distancesBehind[targetIndex] <= segmentEnd + Number.EPSILON
      ) {
        result[targetIndex] = interpolateFromNewer(
          newer,
          older,
          Math.max(0, distancesBehind[targetIndex] - traversed),
          segmentLength
        );
        targetIndex += 1;
      }
      traversed = segmentEnd;
    }

    const oldest = this.oldest;
    while (targetIndex < distancesBehind.length) {
      result[targetIndex] = cloneVec3(oldest);
      targetIndex += 1;
    }

    return result;
  }

  trimToDistance(distanceToKeep: number): void {
    if (!Number.isFinite(distanceToKeep) || distanceToKeep < 0) {
      throw new RangeError('Trail retention distance must be a finite non-negative number.');
    }
    if (this.samples.length <= 1) return;
    if (distanceToKeep === 0) {
      this.samples.splice(0, this.samples.length - 1);
      return;
    }

    let traversed = 0;
    for (let sampleIndex = this.samples.length - 1; sampleIndex > 0; sampleIndex -= 1) {
      traversed += distance(this.samples[sampleIndex - 1], this.samples[sampleIndex]);
      if (traversed + Number.EPSILON >= distanceToKeep) {
        const oldestRequiredIndex = sampleIndex - 1;
        if (oldestRequiredIndex > 0) {
          this.samples.splice(0, oldestRequiredIndex);
        }
        return;
      }
    }
  }
}

export function sampleTrailAtDistance(trail: TrailBuffer, distanceBehind: number): Vec3 {
  return trail.sampleFromNewest(distanceBehind);
}
