import { GRID_CONFIG, type GridConfig } from './grid-config';
import type { GridCell } from './grid-types';
import type { Vec3 } from './types';

export type SteeringInput = Readonly<{
  yaw: number;
  pitch: number;
}>;

export type GridPoint = Readonly<{
  x: number;
  y: number;
  z: number;
}>;

export type FlightOrientation = Readonly<{
  yaw: number;
  pitch: number;
  roll: 0;
}>;

export type FlightPose = Readonly<{
  unwrappedPosition: GridPoint;
  wrappedPosition: GridPoint;
  orientation: FlightOrientation;
  forward: Vec3;
}>;

export const STEERING_RATE = Math.PI * 0.9;
export const MAX_PITCH = Math.PI * (80 / 180);
export const FLIGHT_SPEED_CELLS_PER_SECOND = 6;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function requireValidDt(dt: number): void {
  if (!Number.isFinite(dt) || dt < 0) {
    throw new RangeError('Flight dt must be a finite non-negative number.');
  }
}

function wrapAxis(value: number, resolution: number): number {
  return ((value % resolution) + resolution) % resolution;
}

export function wrapGridPoint(point: GridPoint, resolution: number): GridPoint {
  if (!Number.isInteger(resolution) || resolution < 2) {
    throw new RangeError('Flight grid resolution must be an integer >= 2.');
  }

  return Object.freeze({
    x: wrapAxis(point.x, resolution),
    y: wrapAxis(point.y, resolution),
    z: wrapAxis(point.z, resolution)
  });
}

export function forwardVector(orientation: FlightOrientation): Vec3 {
  const cosPitch = Math.cos(orientation.pitch);
  return Object.freeze({
    x: Math.sin(orientation.yaw) * cosPitch,
    y: Math.sin(orientation.pitch),
    z: Math.cos(orientation.yaw) * cosPitch
  });
}

export function applySteering(
  orientation: FlightOrientation,
  input: SteeringInput,
  dt: number
): FlightOrientation {
  requireValidDt(dt);

  const yawInput = clamp(input.yaw, -1, 1);
  const pitchInput = clamp(input.pitch, -1, 1);
  const yaw = orientation.yaw + yawInput * STEERING_RATE * dt;
  const pitch = clamp(
    orientation.pitch + pitchInput * STEERING_RATE * dt,
    -MAX_PITCH,
    MAX_PITCH
  );

  if (yaw === orientation.yaw && pitch === orientation.pitch) {
    return orientation;
  }

  return Object.freeze({ yaw, pitch, roll: 0 as const });
}

export function createInitialFlightPose(
  headCell: GridCell,
  config: GridConfig = GRID_CONFIG
): FlightPose {
  for (const axis of ['x', 'y', 'z'] as const) {
    const value = headCell[axis];
    if (!Number.isInteger(value) || value < 0 || value >= config.resolution) {
      throw new RangeError(`Head cell ${axis} must be an integer in 0..${config.resolution - 1}.`);
    }
  }

  const unwrappedPosition = Object.freeze({
    x: headCell.x + 0.5,
    y: headCell.y + 0.5,
    z: headCell.z + 0.5
  });
  const orientation = Object.freeze({ yaw: 0, pitch: 0, roll: 0 as const });

  return Object.freeze({
    unwrappedPosition,
    wrappedPosition: unwrappedPosition,
    orientation,
    forward: forwardVector(orientation)
  });
}

export function advanceFlightPose(
  pose: FlightPose,
  input: SteeringInput,
  dt: number,
  config: GridConfig = GRID_CONFIG
): FlightPose {
  requireValidDt(dt);
  const orientation = applySteering(pose.orientation, input, dt);
  const forward = forwardVector(orientation);
  const distance = FLIGHT_SPEED_CELLS_PER_SECOND * dt;
  const unwrappedPosition = Object.freeze({
    x: pose.unwrappedPosition.x + forward.x * distance,
    y: pose.unwrappedPosition.y + forward.y * distance,
    z: pose.unwrappedPosition.z + forward.z * distance
  });

  return Object.freeze({
    unwrappedPosition,
    wrappedPosition: wrapGridPoint(unwrappedPosition, config.resolution),
    orientation,
    forward
  });
}
