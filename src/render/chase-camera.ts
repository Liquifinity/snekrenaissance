import type { PerspectiveCamera } from 'three';
import { GRID_CONFIG, type GridConfig } from '../game/grid-config';
import type { Vec3 } from '../game/types';

export const CAMERA_DISTANCE_CELLS = 4;
export const CAMERA_HEIGHT_CELLS = 2.8;
export const CAMERA_LOOK_AHEAD_CELLS = 2;
export const CAMERA_FOV = 60;
export const CAMERA_SMOOTHING = 8;

export type ChaseCameraSnapshot = Readonly<{
  headWorld: Vec3;
  forwardWorld: Vec3;
  upWorld: Vec3;
  displayWrapOffset: Vec3;
}>;

/** Temporary Task 9→10 bridge for the still-unmigrated browser loop. */
type LegacyChaseCameraSnapshot = Readonly<{
  headWrapped: Vec3;
  headUnwrapped?: Vec3;
  forward: Vec3;
  wrapOffset: Vec3;
  up?: Vec3;
}>;

export type CameraPose = Readonly<{
  position: Vec3;
  target: Vec3;
}>;

function clone(value: Vec3): Vec3 {
  return { x: value.x, y: value.y, z: value.z };
}

function normalize(value: Vec3, fallback: Vec3): Vec3 {
  const length = Math.hypot(value.x, value.y, value.z);
  if (!Number.isFinite(length) || length < 1e-10) return clone(fallback);
  return { x: value.x / length, y: value.y / length, z: value.z / length };
}

function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function subtract(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function scale(value: Vec3, amount: number): Vec3 {
  return { x: value.x * amount, y: value.y * amount, z: value.z * amount };
}

function lerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t
  };
}

function isV2Snapshot(
  snapshot: ChaseCameraSnapshot | LegacyChaseCameraSnapshot
): snapshot is ChaseCameraSnapshot {
  return 'headWorld' in snapshot;
}

function normalizeSnapshot(
  snapshot: ChaseCameraSnapshot | LegacyChaseCameraSnapshot
): ChaseCameraSnapshot {
  if (isV2Snapshot(snapshot)) return snapshot;

  const hasUnwrappedHead = snapshot.headUnwrapped !== undefined;
  return {
    headWorld: hasUnwrappedHead ? snapshot.headUnwrapped! : snapshot.headWrapped,
    forwardWorld: snapshot.forward,
    upWorld: snapshot.up ?? { x: 0, y: 1, z: 0 },
    displayWrapOffset: hasUnwrappedHead ? snapshot.wrapOffset : { x: 0, y: 0, z: 0 }
  };
}

function desiredPose(snapshot: ChaseCameraSnapshot, config: GridConfig): CameraPose {
  const forward = normalize(snapshot.forwardWorld, { x: 0, y: 0, z: 1 });
  const up = normalize(snapshot.upWorld, { x: 0, y: 1, z: 0 });
  const displayedHead = add(snapshot.headWorld, snapshot.displayWrapOffset);
  const distance = CAMERA_DISTANCE_CELLS * config.cellSize;
  const height = CAMERA_HEIGHT_CELLS * config.cellSize;
  const lookAhead = CAMERA_LOOK_AHEAD_CELLS * config.cellSize;

  return {
    position: add(
      subtract(displayedHead, scale(forward, distance)),
      scale(up, height)
    ),
    target: add(displayedHead, scale(forward, lookAhead))
  };
}

export class ChaseCameraController {
  private pose: CameraPose | null = null;
  private lastDisplayWrapOffset: Vec3 | null = null;

  constructor(
    private readonly camera?: PerspectiveCamera,
    private readonly config: GridConfig = GRID_CONFIG
  ) {
    if (this.camera) {
      this.camera.fov = CAMERA_FOV;
      this.camera.updateProjectionMatrix();
    }
  }

  update(
    rawSnapshot: ChaseCameraSnapshot | LegacyChaseCameraSnapshot,
    dtSeconds: number
  ): CameraPose {
    if (!Number.isFinite(dtSeconds) || dtSeconds < 0) {
      throw new RangeError('Camera dt must be a finite non-negative number.');
    }

    const snapshot = normalizeSnapshot(rawSnapshot);
    const desired = desiredPose(snapshot, this.config);

    if (!this.pose || !this.lastDisplayWrapOffset) {
      this.pose = {
        position: clone(desired.position),
        target: clone(desired.target)
      };
    } else {
      const wrapDelta = subtract(
        snapshot.displayWrapOffset,
        this.lastDisplayWrapOffset
      );

      if (wrapDelta.x !== 0 || wrapDelta.y !== 0 || wrapDelta.z !== 0) {
        this.pose = {
          position: add(this.pose.position, wrapDelta),
          target: add(this.pose.target, wrapDelta)
        };
      }

      const alpha = dtSeconds === 0
        ? 1
        : 1 - Math.exp(-CAMERA_SMOOTHING * dtSeconds);
      this.pose = {
        position: lerp(this.pose.position, desired.position, alpha),
        target: lerp(this.pose.target, desired.target, alpha)
      };
    }

    this.lastDisplayWrapOffset = clone(snapshot.displayWrapOffset);

    if (this.camera) {
      if (this.camera.fov !== CAMERA_FOV) {
        this.camera.fov = CAMERA_FOV;
        this.camera.updateProjectionMatrix();
      }
      this.camera.position.set(
        this.pose.position.x,
        this.pose.position.y,
        this.pose.position.z
      );
      this.camera.lookAt(
        this.pose.target.x,
        this.pose.target.y,
        this.pose.target.z
      );
    }

    return {
      position: clone(this.pose.position),
      target: clone(this.pose.target)
    };
  }

  reset(): void {
    this.pose = null;
    this.lastDisplayWrapOffset = null;
  }
}
