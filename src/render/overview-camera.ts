import type { PerspectiveCamera } from 'three';
import { GRID_CONFIG, type GridConfig } from '../game/grid-config';

export const OVERVIEW_CAMERA_DISTANCE_MULTIPLIER = 1.8;

export const OVERVIEW_CAMERA_POSITION = {
  x: 0,
  y: 0,
  z: -GRID_CONFIG.worldSize * OVERVIEW_CAMERA_DISTANCE_MULTIPLIER
} as const;

export function applyOverviewCamera(
  camera: PerspectiveCamera,
  config: GridConfig = GRID_CONFIG
): void {
  camera.position.set(
    0,
    0,
    -config.worldSize * OVERVIEW_CAMERA_DISTANCE_MULTIPLIER
  );
  camera.lookAt(0, 0, 0);
}
