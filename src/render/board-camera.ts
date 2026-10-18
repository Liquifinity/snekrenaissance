import type { PerspectiveCamera } from 'three';
import { GRID_CONFIG, type GridConfig } from '../game/grid-config';
import type { Vec3 } from '../game/types';
import type { CameraBasis } from './view-frame';

export const BOARD_CAMERA_FOV = 60;
export const BOARD_CAMERA_FRAMING_MARGIN = 1.10;
export const BOARD_CAMERA_ZOOM_MIN = 0.65;
export const BOARD_CAMERA_ZOOM_MAX = 5;
export const BOARD_CAMERA_ZOOM_DEFAULT = 1;
export const BOARD_CAMERA_POLAR_MIN = Math.PI / 180;
export const BOARD_CAMERA_POLAR_MAX = 179 * Math.PI / 180;

const rawRay = Object.freeze({ x: 0.65, y: 0.55, z: 1.0 });
const rawRayLength = Math.hypot(rawRay.x, rawRay.y, rawRay.z);

export const BOARD_CAMERA_POSITION_RAY: Vec3 = Object.freeze({
  x: rawRay.x / rawRayLength,
  y: rawRay.y / rawRayLength,
  z: rawRay.z / rawRayLength
});

const BOARD_CAMERA_TARGET: Vec3 = Object.freeze({ x: 0, y: 0, z: 0 });
const WORLD_UP: Vec3 = Object.freeze({ x: 0, y: 1, z: 0 });
const INITIAL_AZIMUTH = Math.atan2(BOARD_CAMERA_POSITION_RAY.x, BOARD_CAMERA_POSITION_RAY.z);
const INITIAL_POLAR = Math.acos(BOARD_CAMERA_POSITION_RAY.y);

export type BoardCameraPose = Readonly<{
  position: Vec3;
  target: Vec3;
  distance: number;
  basis: CameraBasis;
}>;

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  };
}

function normalize(vector: Vec3): Vec3 {
  const length = Math.hypot(vector.x, vector.y, vector.z);
  if (!Number.isFinite(length) || length <= 0) {
    throw new RangeError('Camera basis vector must have finite non-zero length.');
  }
  return Object.freeze({
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length
  });
}

function positionRayFor(azimuth: number, polar: number): Vec3 {
  const sinPolar = Math.sin(polar);
  return Object.freeze({
    x: sinPolar * Math.sin(azimuth),
    y: Math.cos(polar),
    z: sinPolar * Math.cos(azimuth)
  });
}

function basisForPositionRay(positionRay: Vec3): CameraBasis {
  const intoScreen = normalize({
    x: -positionRay.x,
    y: -positionRay.y,
    z: -positionRay.z
  });
  const right = normalize(cross(intoScreen, WORLD_UP));
  const up = normalize(cross(right, intoScreen));
  return Object.freeze({ intoScreen, right, up });
}

function normalizeAzimuth(value: number): number {
  const twoPi = Math.PI * 2;
  return ((value + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
}

export function computeBoardCameraDistance(
  config: GridConfig = GRID_CONFIG,
  aspect = 1,
  fovDegrees = BOARD_CAMERA_FOV
): number {
  if (!Number.isFinite(aspect) || aspect <= 0) {
    throw new RangeError('Camera aspect must be finite and > 0.');
  }
  if (!Number.isFinite(fovDegrees) || fovDegrees <= 0 || fovDegrees >= 180) {
    throw new RangeError('Camera FOV must be finite and in (0, 180).');
  }

  const verticalHalfFov = (fovDegrees * Math.PI / 180) / 2;
  const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * aspect);
  const limitingHalfFov = Math.min(verticalHalfFov, horizontalHalfFov);
  const cubeRadius = Math.sqrt(3) * config.worldSize / 2;
  return cubeRadius / Math.sin(limitingHalfFov) * BOARD_CAMERA_FRAMING_MARGIN;
}

export class BoardCameraController {
  private currentZoomFactor = BOARD_CAMERA_ZOOM_DEFAULT;
  private azimuth = INITIAL_AZIMUTH;
  private polar = INITIAL_POLAR;

  constructor(
    private readonly camera?: PerspectiveCamera,
    private readonly config: GridConfig = GRID_CONFIG
  ) {
    if (this.camera) {
      this.camera.fov = BOARD_CAMERA_FOV;
      this.camera.up.set(0, 1, 0);
      this.camera.updateProjectionMatrix();
    }
  }

  get zoomFactor(): number {
    return this.currentZoomFactor;
  }

  setZoomFactor(factor: number): void {
    if (!Number.isFinite(factor) || factor <= 0) {
      throw new RangeError('Camera zoom factor must be finite and > 0.');
    }
    this.currentZoomFactor = Math.min(
      BOARD_CAMERA_ZOOM_MAX,
      Math.max(BOARD_CAMERA_ZOOM_MIN, factor)
    );
  }

  orbitBy(deltaAzimuth: number, deltaPolar: number): void {
    if (!Number.isFinite(deltaAzimuth) || !Number.isFinite(deltaPolar)) {
      throw new RangeError('Camera orbit deltas must be finite.');
    }
    this.azimuth = normalizeAzimuth(this.azimuth + deltaAzimuth);
    this.polar = Math.min(
      BOARD_CAMERA_POLAR_MAX,
      Math.max(BOARD_CAMERA_POLAR_MIN, this.polar + deltaPolar)
    );
  }

  apply(aspect = this.camera?.aspect ?? 1): BoardCameraPose {
    const distance = computeBoardCameraDistance(this.config, aspect) * this.currentZoomFactor;
    const ray = positionRayFor(this.azimuth, this.polar);
    const position = Object.freeze({
      x: ray.x * distance,
      y: ray.y * distance,
      z: ray.z * distance
    });
    const target = Object.freeze({ ...BOARD_CAMERA_TARGET });
    const basis = basisForPositionRay(ray);

    if (this.camera) {
      this.camera.aspect = aspect;
      this.camera.fov = BOARD_CAMERA_FOV;
      this.camera.up.set(0, 1, 0);
      this.camera.position.set(position.x, position.y, position.z);
      this.camera.lookAt(target.x, target.y, target.z);
      this.camera.updateProjectionMatrix();
    }

    return Object.freeze({ position, target, distance, basis });
  }
}
