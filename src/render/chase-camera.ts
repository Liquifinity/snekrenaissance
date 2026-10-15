import type { PerspectiveCamera } from 'three';
import type { Vec3 } from '../game/types';

export const CAMERA_DISTANCE = 4.2;
export const CAMERA_HEIGHT = 1.35;
export const CAMERA_LOOK_AHEAD = 0.6;
export const CAMERA_SMOOTHING = 8;

export type ChaseCameraSnapshot = {
  headWrapped: Vec3;
  forward: Vec3;
  wrapOffset: Vec3;
  up?: Vec3;
};

export type CameraPose = {
  position: Vec3;
  target: Vec3;
};

function clone(value: Vec3): Vec3 {
  return { x: value.x, y: value.y, z: value.z };
}

function normalize(value: Vec3): Vec3 {
  const length = Math.hypot(value.x, value.y, value.z);
  if (length === 0) return { x: 0, y: 0, z: 1 };
  return { x: value.x / length, y: value.y / length, z: value.z / length };
}

function lerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t
  };
}

function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function desiredPose(snapshot: ChaseCameraSnapshot): CameraPose {
  const forward = normalize(snapshot.forward);
  const up = normalize(snapshot.up ?? { x: 0, y: 1, z: 0 });

  return {
    position: {
      x: snapshot.headWrapped.x - forward.x * CAMERA_DISTANCE + up.x * CAMERA_HEIGHT,
      y: snapshot.headWrapped.y - forward.y * CAMERA_DISTANCE + up.y * CAMERA_HEIGHT,
      z: snapshot.headWrapped.z - forward.z * CAMERA_DISTANCE + up.z * CAMERA_HEIGHT
    },
    target: {
      x: snapshot.headWrapped.x + forward.x * CAMERA_LOOK_AHEAD,
      y: snapshot.headWrapped.y + forward.y * CAMERA_LOOK_AHEAD,
      z: snapshot.headWrapped.z + forward.z * CAMERA_LOOK_AHEAD
    }
  };
}

export class ChaseCameraController {
  private pose: CameraPose | null = null;
  private lastWrapOffset: Vec3 | null = null;

  constructor(private readonly camera?: PerspectiveCamera) {}

  update(snapshot: ChaseCameraSnapshot, dtSeconds: number): CameraPose {
    if (!Number.isFinite(dtSeconds) || dtSeconds < 0) {
      throw new RangeError('Camera dt must be a finite non-negative number.');
    }

    const desired = desiredPose(snapshot);

    if (!this.pose || !this.lastWrapOffset) {
      this.pose = {
        position: clone(desired.position),
        target: clone(desired.target)
      };
    } else {
      const wrapDelta = {
        x: snapshot.wrapOffset.x - this.lastWrapOffset.x,
        y: snapshot.wrapOffset.y - this.lastWrapOffset.y,
        z: snapshot.wrapOffset.z - this.lastWrapOffset.z
      };

      if (wrapDelta.x !== 0 || wrapDelta.y !== 0 || wrapDelta.z !== 0) {
        this.pose = {
          position: add(this.pose.position, wrapDelta),
          target: add(this.pose.target, wrapDelta)
        };
      }

      const alpha = 1 - Math.exp(-CAMERA_SMOOTHING * dtSeconds);
      this.pose = {
        position: lerp(this.pose.position, desired.position, alpha),
        target: lerp(this.pose.target, desired.target, alpha)
      };
    }

    this.lastWrapOffset = clone(snapshot.wrapOffset);

    if (this.camera) {
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
    this.lastWrapOffset = null;
  }
}
