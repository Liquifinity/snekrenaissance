import type { GridPoint } from '../game/flight';

function clonePoint(point: GridPoint): GridPoint {
  if (![point.x, point.y, point.z].every(Number.isFinite)) {
    throw new RangeError('FlightTrail points must contain finite coordinates.');
  }
  return Object.freeze({ x: point.x, y: point.y, z: point.z });
}

function distance(a: GridPoint, b: GridPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function interpolate(a: GridPoint, b: GridPoint, alpha: number): GridPoint {
  return Object.freeze({
    x: a.x + (b.x - a.x) * alpha,
    y: a.y + (b.y - a.y) * alpha,
    z: a.z + (b.z - a.z) * alpha
  });
}

function requireDistance(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a finite non-negative number.`);
  }
}

export class FlightTrail {
  private points: GridPoint[] = [];

  reset(pointsNewestToOldest: readonly GridPoint[]): void {
    this.points = pointsNewestToOldest.map(clonePoint);
  }

  push(head: GridPoint): void {
    const next = clonePoint(head);
    const newest = this.points[0];
    if (newest && distance(newest, next) <= Number.EPSILON) return;
    this.points.unshift(next);
  }

  trimToDistance(maxDistanceCells: number): void {
    requireDistance(maxDistanceCells, 'FlightTrail max distance');
    if (this.points.length <= 1) return;
    if (maxDistanceCells === 0) {
      this.points = [this.points[0]];
      return;
    }

    const trimmed: GridPoint[] = [this.points[0]];
    let accumulated = 0;

    for (let index = 1; index < this.points.length; index += 1) {
      const previous = this.points[index - 1];
      const current = this.points[index];
      const segmentLength = distance(previous, current);
      if (segmentLength <= Number.EPSILON) continue;

      if (accumulated + segmentLength <= maxDistanceCells + Number.EPSILON) {
        trimmed.push(current);
        accumulated += segmentLength;
        continue;
      }

      const remaining = maxDistanceCells - accumulated;
      if (remaining > Number.EPSILON) {
        trimmed.push(interpolate(previous, current, remaining / segmentLength));
      }
      break;
    }

    this.points = trimmed;
  }

  sampleBehind(distanceCells: number, headOverride?: GridPoint): GridPoint {
    requireDistance(distanceCells, 'FlightTrail sample distance');
    if (this.points.length === 0) {
      throw new RangeError('FlightTrail has no samples.');
    }

    const path = headOverride
      ? [clonePoint(headOverride), ...this.points.slice(1)]
      : this.points;

    if (distanceCells === 0 || path.length === 1) return clonePoint(path[0]);

    let accumulated = 0;
    for (let index = 1; index < path.length; index += 1) {
      const previous = path[index - 1];
      const current = path[index];
      const segmentLength = distance(previous, current);
      if (segmentLength <= Number.EPSILON) continue;

      if (accumulated + segmentLength + Number.EPSILON >= distanceCells) {
        const localDistance = Math.max(0, distanceCells - accumulated);
        return interpolate(previous, current, Math.min(1, localDistance / segmentLength));
      }
      accumulated += segmentLength;
    }

    return clonePoint(path[path.length - 1]);
  }
}
