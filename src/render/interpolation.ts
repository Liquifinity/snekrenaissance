import { Matrix4, Quaternion, Vector3 } from 'three';
import { GRID_CONFIG, type GridConfig } from '../game/grid-config';
import { cellToWorld, directionVector } from '../game/grid-topology';
import type { GridCell, GridFrame } from '../game/grid-types';
import type { LogicalTransition } from '../game/logical-transition';
import type { Vec3 } from '../game/types';

export type SegmentRenderTransition = Readonly<{
  id: number;
  from: GridCell;
  to: GridCell;
  born: boolean;
}>;

export type RenderTransition = Readonly<{
  head: SegmentRenderTransition;
  body: readonly SegmentRenderTransition[];
  previousFrame: GridFrame;
  currentFrame: GridFrame;
}>;

export type InterpolatedFrame = Readonly<{
  forward: Vec3;
  right: Vec3;
  up: Vec3;
  quaternion: Readonly<{ x: number; y: number; z: number; w: number }>;
}>;

export type InterpolatedSegment = Readonly<{
  id: number;
  /** Local unwrapped interpolation position. Add displayWrapOffset for canonical display. */
  position: Vec3;
  born: boolean;
  birthAlpha: number;
  displayWrapOffset: Vec3;
  duplicatePosition: Vec3 | null;
}>;

export type InterpolatedTransition = Readonly<{
  head: InterpolatedSegment;
  body: readonly InterpolatedSegment[];
  frame: InterpolatedFrame;
}>;

function cloneCell(cell: GridCell): GridCell {
  return Object.freeze({ x: cell.x, y: cell.y, z: cell.z });
}

function freezeSegmentTransition(
  id: number,
  from: GridCell,
  to: GridCell,
  born: boolean
): SegmentRenderTransition {
  return Object.freeze({ id, from: cloneCell(from), to: cloneCell(to), born });
}

export function buildRenderTransition(
  logical: LogicalTransition,
  _config: GridConfig = GRID_CONFIG
): RenderTransition {
  const current = logical.current.segments;
  const previous = logical.previous.segments;
  const currentHead = current[0];
  const previousHead = previous[0];
  if (!currentHead || !previousHead) {
    throw new RangeError('Render transition requires a head segment in both snapshots');
  }

  const previousById = new Map(previous.map((segment) => [segment.id, segment]));
  const previousTail = previous[previous.length - 1];

  const mapSegment = (segment: (typeof current)[number]): SegmentRenderTransition => {
    const prior = previousById.get(segment.id);
    if (prior) {
      return freezeSegmentTransition(segment.id, prior.cell, segment.cell, false);
    }

    const isBorn = logical.bornSegmentId === segment.id;
    if (!isBorn || !previousTail) {
      throw new RangeError(`Missing previous render correspondence for segment ${segment.id}`);
    }

    return freezeSegmentTransition(segment.id, previousTail.cell, segment.cell, true);
  };

  const head = mapSegment(currentHead);
  const body = Object.freeze(current.slice(1).map(mapSegment));

  return Object.freeze({
    head,
    body,
    previousFrame: Object.freeze({ ...logical.previous.frame }),
    currentFrame: Object.freeze({ ...logical.current.frame })
  });
}

function clampAlpha(alpha: number): number {
  if (!Number.isFinite(alpha)) return alpha < 0 ? 0 : 1;
  return Math.min(1, Math.max(0, alpha));
}

function virtualTarget(from: GridCell, to: GridCell, resolution: number): GridCell {
  const target = { x: to.x, y: to.y, z: to.z };
  for (const axis of ['x', 'y', 'z'] as const) {
    if (from[axis] === resolution - 1 && to[axis] === 0) target[axis] = resolution;
    else if (from[axis] === 0 && to[axis] === resolution - 1) target[axis] = -1;
  }
  return target;
}

function lerpVec3(a: Vec3, b: Vec3, alpha: number): Vec3 {
  return {
    x: a.x + (b.x - a.x) * alpha,
    y: a.y + (b.y - a.y) * alpha,
    z: a.z + (b.z - a.z) * alpha
  };
}

function displayOffset(position: Vec3, config: GridConfig): Vec3 {
  const half = config.worldSize / 2;
  const offset = { x: 0, y: 0, z: 0 };

  for (const axis of ['x', 'y', 'z'] as const) {
    if (position[axis] > half) offset[axis] = -config.worldSize;
    else if (position[axis] < -half) offset[axis] = config.worldSize;
  }

  return offset;
}

function hasWrap(from: GridCell, to: GridCell, resolution: number): boolean {
  return (from.x === resolution - 1 && to.x === 0)
    || (from.x === 0 && to.x === resolution - 1)
    || (from.y === resolution - 1 && to.y === 0)
    || (from.y === 0 && to.y === resolution - 1)
    || (from.z === resolution - 1 && to.z === 0)
    || (from.z === 0 && to.z === resolution - 1);
}

function canonicalPosition(position: Vec3, offset: Vec3): Vec3 {
  return {
    x: position.x + offset.x,
    y: position.y + offset.y,
    z: position.z + offset.z
  };
}

function oppositeDuplicate(
  transition: SegmentRenderTransition,
  position: Vec3,
  offset: Vec3,
  config: GridConfig
): Vec3 | null {
  if (!hasWrap(transition.from, transition.to, config.resolution)) return null;

  const canonical = canonicalPosition(position, offset);
  if (offset.x !== 0 || offset.y !== 0 || offset.z !== 0) {
    return Object.freeze({ ...position });
  }

  const duplicate = { ...position };
  for (const axis of ['x', 'y', 'z'] as const) {
    if (transition.from[axis] === config.resolution - 1 && transition.to[axis] === 0) {
      duplicate[axis] -= config.worldSize;
    } else if (transition.from[axis] === 0 && transition.to[axis] === config.resolution - 1) {
      duplicate[axis] += config.worldSize;
    } else {
      duplicate[axis] = canonical[axis];
    }
  }
  return Object.freeze(duplicate);
}

function interpolateSegment(
  transition: SegmentRenderTransition,
  alpha: number,
  config: GridConfig
): InterpolatedSegment {
  const toVirtual = virtualTarget(transition.from, transition.to, config.resolution);
  const fromWorld = cellToWorld(transition.from, config);
  const toWorld = cellToWorld(toVirtual, config);
  const position = lerpVec3(fromWorld, toWorld, alpha);
  const offset = displayOffset(position, config);

  return Object.freeze({
    id: transition.id,
    position: Object.freeze(position),
    born: transition.born,
    birthAlpha: transition.born ? alpha : 1,
    displayWrapOffset: Object.freeze(offset),
    duplicatePosition: oppositeDuplicate(transition, position, offset, config)
  });
}

function axisVector(direction: GridFrame['forward']): Vector3 {
  const vector = directionVector(direction);
  return new Vector3(vector.x, vector.y, vector.z);
}

function frameQuaternion(frame: GridFrame): Quaternion {
  const visualX = axisVector(frame.right).multiplyScalar(-1);
  const visualY = axisVector(frame.up);
  const visualZ = axisVector(frame.forward);
  const matrix = new Matrix4().makeBasis(visualX, visualY, visualZ);
  return new Quaternion().setFromRotationMatrix(matrix).normalize();
}

function vec3FromThree(vector: Vector3): Vec3 {
  return { x: vector.x, y: vector.y, z: vector.z };
}

function interpolateFrame(previous: GridFrame, current: GridFrame, alpha: number): InterpolatedFrame {
  const quaternion = frameQuaternion(previous).slerp(frameQuaternion(current), alpha).normalize();
  const forward = new Vector3(0, 0, 1).applyQuaternion(quaternion).normalize();
  const up = new Vector3(0, 1, 0).applyQuaternion(quaternion).normalize();
  const right = new Vector3(-1, 0, 0).applyQuaternion(quaternion).normalize();

  return Object.freeze({
    forward: Object.freeze(vec3FromThree(forward)),
    right: Object.freeze(vec3FromThree(right)),
    up: Object.freeze(vec3FromThree(up)),
    quaternion: Object.freeze({
      x: quaternion.x,
      y: quaternion.y,
      z: quaternion.z,
      w: quaternion.w
    })
  });
}

export function interpolateTransition(
  transition: RenderTransition,
  alpha: number,
  config: GridConfig = GRID_CONFIG
): InterpolatedTransition {
  const t = clampAlpha(alpha);
  return Object.freeze({
    head: interpolateSegment(transition.head, t, config),
    body: Object.freeze(transition.body.map((segment) => interpolateSegment(segment, t, config))),
    frame: interpolateFrame(transition.previousFrame, transition.currentFrame, t)
  });
}
