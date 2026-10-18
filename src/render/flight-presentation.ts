import { Quaternion, Vector3 } from 'three';
import type { FlightOrientation, FlightPose, GridPoint } from '../game/flight';
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

function wrapAxis(value: number, resolution: number): number {
  return ((value % resolution) + resolution) % resolution;
}

export function unwrappedWorldForGridPoint(
  point: GridPoint,
  config: GridConfig = GRID_CONFIG
): Vec3 {
  const half = config.worldSize / 2;
  return Object.freeze({
    x: point.x * config.cellSize - half,
    y: point.y * config.cellSize - half,
    z: point.z * config.cellSize - half
  });
}

export function displayWorldForGridPoint(
  point: GridPoint,
  config: GridConfig = GRID_CONFIG
): Vec3 {
  return unwrappedWorldForGridPoint({
    x: wrapAxis(point.x, config.resolution),
    y: wrapAxis(point.y, config.resolution),
    z: wrapAxis(point.z, config.resolution)
  }, config);
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

function toVec3(vector: Vector3): Vec3 {
  return Object.freeze({ x: vector.x, y: vector.y, z: vector.z });
}

export function interpolateFlightPresentation(
  previous: FlightPose,
  current: FlightPose,
  alpha: number,
  config: GridConfig = GRID_CONFIG
): FlightPresentation {
  const t = clampAlpha(alpha);
  const unwrappedGridPoint = Object.freeze({
    x: previous.unwrappedPosition.x + (current.unwrappedPosition.x - previous.unwrappedPosition.x) * t,
    y: previous.unwrappedPosition.y + (current.unwrappedPosition.y - previous.unwrappedPosition.y) * t,
    z: previous.unwrappedPosition.z + (current.unwrappedPosition.z - previous.unwrappedPosition.z) * t
  });
  const orientation: FlightOrientation = Object.freeze({
    yaw: previous.orientation.yaw + (current.orientation.yaw - previous.orientation.yaw) * t,
    pitch: previous.orientation.pitch + (current.orientation.pitch - previous.orientation.pitch) * t,
    roll: 0
  });
  const quaternion = quaternionFromOrientation(orientation);
  const forwardWorld = toVec3(new Vector3(0, 0, 1).applyQuaternion(quaternion).normalize());
  const upWorld = toVec3(new Vector3(0, 1, 0).applyQuaternion(quaternion).normalize());
  const headWorld = unwrappedWorldForGridPoint(unwrappedGridPoint, config);
  const displayedHeadWorld = displayWorldForGridPoint(unwrappedGridPoint, config);
  const displayWrapOffset = Object.freeze({
    x: displayedHeadWorld.x - headWorld.x,
    y: displayedHeadWorld.y - headWorld.y,
    z: displayedHeadWorld.z - headWorld.z
  });

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
