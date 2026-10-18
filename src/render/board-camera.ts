import type { PerspectiveCamera } from 'three';
import { GRID_CONFIG, type GridConfig } from '../game/grid-config';
import type { Vec3 } from '../game/types';

export const BOARD_CAMERA_FOV = 60;
export const BOARD_CAMERA_FRAMING_MARGIN = 1.10;
export const BOARD_CAMERA_ZOOM_MIN = 0.65;
export const BOARD_CAMERA_ZOOM_MAX = 5;
export const BOARD_CAMERA_ZOOM_DEFAULT = 1;

const rawRay = Object.freeze({ x: 0.65, y: 0.55, z: 1.0 });
const rawRayLength = Math.hypot(rawRay.x, rawRay.y, rawRay.z);

export const BOARD_CAMERA_POSITION_RAY: Vec3 = Object.freeze({
  x: rawRay.x / rawRayLength,
  y: rawRay.y / rawRayLength,
  z: rawRay.z / rawRayLength
});

const BOARD_CAMERA_TARGET: Vec3 = Object.freeze({ x: 0, y: 0, z: 0 });

export type BoardCameraPose = Readonly<{
  position: Vec3;
  target: Vec3;
  distance: number;
}>;

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

  apply(aspect = this.camera?.aspect ?? 1): BoardCameraPose {
    const distance = computeBoardCameraDistance(this.config, aspect) * this.currentZoomFactor;
    const position = Object.freeze({
      x: BOARD_CAMERA_POSITION_RAY.x * distance,
      y: BOARD_CAMERA_POSITION_RAY.y * distance,
      z: BOARD_CAMERA_POSITION_RAY.z * distance
    });
    const target = Object.freeze({ ...BOARD_CAMERA_TARGET });

    if (this.camera) {
      this.camera.aspect = aspect;
      this.camera.fov = BOARD_CAMERA_FOV;
      this.camera.up.set(0, 1, 0);
      this.camera.position.set(position.x, position.y, position.z);
      this.camera.lookAt(target.x, target.y, target.z);
      this.camera.updateProjectionMatrix();
    }

    return Object.freeze({ position, target, distance });
  }
}
