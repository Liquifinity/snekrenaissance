import { MAX_PITCH, STEERING_RATE } from './constants';
import type { Vec3 } from './types';

export type Quaternion = {
  x: number;
  y: number;
  z: number;
  w: number;
};

export type SteeringInput = {
  yaw: number;
  pitch: number;
};

export type OrientationState = {
  yaw: number;
  pitch: number;
  roll: 0;
  quaternion: Quaternion;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function quaternionFromYawPitch(yaw: number, pitch: number): Quaternion {
  const halfYaw = yaw / 2;
  const halfPitch = -pitch / 2;
  const sy = Math.sin(halfYaw);
  const cy = Math.cos(halfYaw);
  const sp = Math.sin(halfPitch);
  const cp = Math.cos(halfPitch);

  return {
    x: cy * sp,
    y: sy * cp,
    z: -sy * sp,
    w: cy * cp
  };
}

export function createInitialOrientation(): OrientationState {
  return {
    yaw: 0,
    pitch: 0,
    roll: 0,
    quaternion: quaternionFromYawPitch(0, 0)
  };
}

export function applySteering(
  orientation: OrientationState,
  input: SteeringInput,
  dt: number,
  steeringRate = STEERING_RATE
): OrientationState {
  if (!Number.isFinite(dt) || dt < 0) {
    throw new RangeError('Steering dt must be a finite non-negative number.');
  }

  const yawInput = clamp(input.yaw, -1, 1);
  const pitchInput = clamp(input.pitch, -1, 1);
  const yaw = orientation.yaw + yawInput * steeringRate * dt;
  const pitch = clamp(
    orientation.pitch + pitchInput * steeringRate * dt,
    -MAX_PITCH,
    MAX_PITCH
  );

  if (yaw === orientation.yaw && pitch === orientation.pitch) {
    return orientation;
  }

  return {
    yaw,
    pitch,
    roll: 0,
    quaternion: quaternionFromYawPitch(yaw, pitch)
  };
}

export function forwardVector(orientation: OrientationState): Vec3 {
  const cosPitch = Math.cos(orientation.pitch);
  return {
    x: Math.sin(orientation.yaw) * cosPitch,
    y: Math.sin(orientation.pitch),
    z: Math.cos(orientation.yaw) * cosPitch
  };
}
