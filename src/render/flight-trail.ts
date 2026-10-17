import type { GridPoint } from '../game/flight';

function clonePoint(point: GridPoint): GridPoint {
  return Object.freeze({ x: point.x, y: point.y, z: point.z });
}

function distance(a: GridPoint, b: GridPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
}

function lerpPoint(a: GridPoint, b: GridPoint, t: number): GridPoint {
  return Object.freeze({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t
  });
}

function samePoint(a: GridPoint, b: GridPoint): boolean {
  return a.x === b.x && a.y === b.y && a.z === b.z;
}

export class FlightTrail {
  private points: GridPoint[] = [];

  reset(pointsNewestToOldest: readonly GridPoint[]): void {
    this.points = pointsNewestToOldest.map(clonePoint);
  }

  push(head: GridPoint): void {
    const point = clonePoint(head);
    if (this.points[0] && samePoint(this.points[0], point)) return;
    this.points.unshift(point);
  }

  trimToDistance(maxDistanceCells: number): void {
    if (!Number.isFinite(maxDistanceCells) || maxDistanceCells < 0) {
      throw new RangeError('FlightTrail trim distance must be finite and non-negative.');
    }
    if (this.points.length <= 1) return;

    const retained: GridPoint[] = [this.points[0]];
    let remaining = maxDistanceCells;

    for (let index = 1; index < this.points.length; index += 1) {
      const from = this.points[index - 1];
      const to = this.points[index];
      const segmentLength = distance(from, to);
      if (segmentLength === 0) continue;

      if (remaining >= segmentLength) {
        retained.push(to);
        remaining -= segmentLength;
        if (remaining <= Number.EPSILON) break;
        continue;
      }

      retained.push(lerpPoint(from, to, remaining / segmentLength));
      remaining = 0;
      break;
    }

    this.points = retained;
  }

  sampleBehind(distanceCells: number, headOverride?: GridPoint): GridPoint {
    if (!Number.isFinite(distanceCells) || distanceCells < 0) {
      throw new RangeError('FlightTrail sample distance must be finite and non-negative.');
    }
    if (this.points.length === 0) {
      throw new RangeError('Cannot sample an empty FlightTrail.');
    }

    const first = headOverride ? clonePoint(headOverride) : this.points[0];
    if (distanceCells === 0) return first;

    const path = headOverride ? [first, ...this.points] : this.points;
    let remaining = distanceCells;

    for (let index = 1; index < path.length; index += 1) {
      const from = path[index - 1];
      const to = path[index];
      const segmentLength = distance(from, to);
      if (segmentLength === 0) continue;

      if (remaining <= segmentLength) {
        return lerpPoint(from, to, remaining / segmentLength);
      }
      remaining -= segmentLength;
    }

    return clonePoint(path[path.length - 1]);
  }
}
