import { Quaternion, Vector3 } from 'three';
import {
  forwardVector,
  wrapGridPoint,
  type FlightOrientation,
  type FlightPose,
  type GridPoint
} from '../game/flight';
import { GRID_CONFIG, type GridConfig } from '../game/grid-config';
import type { Vec3 } from '../game/types';

export type FlightPresentation = Readonly<{
  unwrappedGridPoint: GridPoint;
  headWorld: Vec3;
  displayWrapOffset: Vec3;
  displayedHeadWorld: Vec3;
  forwardWorld: Vec3;
  upWorld: Vec3;
  quaternion: Readonly<{ x: number; y: number; z: number; w: number }>;
}>;

function clampAlpha(alpha: number): number {
  if (!Number.isFinite(alpha)) return alpha < 0 ? 0 : 1;
  return Math.min(1, Math.max(0, alpha));
}

function lerp(a: number, b: number, alpha: number): number {
  return a + (b - a) * alpha;
}

function quaternionFromOrientation(orientation: FlightOrientation): Quaternion {
  const halfYaw = orientation.yaw / 2;
  const halfPitch = -orientation.pitch / 2;
  const sy = Math.sin(halfYaw);
  const cy = Math.cos(halfYaw);
  const sp = Math.sin(halfPitch);
  const cp = Math.cos(halfPitch);

  return new Quaternion(
    cy * sp,
    sy * cp,
    -sy * sp,
    cy * cp
  ).normalize();
}

function vec3(vector: Vector3): Vec3 {
  return Object.freeze({ x: vector.x, y: vector.y, z: vector.z });
}

export function displayWorldForGridPoint(
  point: GridPoint,
  config: GridConfig = GRID_CONFIG
): Vec3 {
  return Object.freeze({
    x: point.x * config.cellSize - config.worldSize / 2,
    y: point.y * config.cellSize - config.worldSize / 2,
    z: point.z * config.cellSize - config.worldSize / 2
  });
}

export function interpolateFlightPresentation(
  previous: FlightPose,
  current: FlightPose,
  alpha: number,
  config: GridConfig = GRID_CONFIG
): FlightPresentation {
  const t = clampAlpha(alpha);
  const unwrappedGridPoint = Object.freeze({
    x: lerp(previous.unwrappedPosition.x, current.unwrappedPosition.x, t),
    y: lerp(previous.unwrappedPosition.y, current.unwrappedPosition.y, t),
    z: lerp(previous.unwrappedPosition.z, current.unwrappedPosition.z, t)
  });
  const orientation: FlightOrientation = Object.freeze({
    yaw: lerp(previous.orientation.yaw, current.orientation.yaw, t),
    pitch: lerp(previous.orientation.pitch, current.orientation.pitch, t),
    roll: 0
  });

  const headWorld = displayWorldForGridPoint(unwrappedGridPoint, config);
  const wrappedPoint = wrapGridPoint(unwrappedGridPoint, config.resolution);
  const displayedHeadWorld = displayWorldForGridPoint(wrappedPoint, config);
  const displayWrapOffset = Object.freeze({
    x: displayedHeadWorld.x - headWorld.x,
    y: displayedHeadWorld.y - headWorld.y,
    z: displayedHeadWorld.z - headWorld.z
  });
  const forwardWorld = Object.freeze(forwardVector(orientation));
  const quaternion = quaternionFromOrientation(orientation);
  const upWorld = vec3(new Vector3(0, 1, 0).applyQuaternion(quaternion).normalize());

  return Object.freeze({
    unwrappedGridPoint,
    headWorld,
    displayWrapOffset,
    displayedHeadWorld,
    forwardWorld,
    upWorld,
    quaternion: Object.freeze({
      x: quaternion.x,
      y: quaternion.y,
      z: quaternion.z,
      w: quaternion.w
    })
  });
}
