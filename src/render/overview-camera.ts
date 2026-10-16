import type { PerspectiveCamera } from 'three';
import { WORLD_SIZE } from '../game/constants';

export const OVERVIEW_CAMERA_POSITION = {
  x: WORLD_SIZE * 0.9,
  y: WORLD_SIZE * 0.75,
  z: -WORLD_SIZE * 1.05
} as const;

export function applyOverviewCamera(camera: PerspectiveCamera): void {
  camera.position.set(
    OVERVIEW_CAMERA_POSITION.x,
    OVERVIEW_CAMERA_POSITION.y,
    OVERVIEW_CAMERA_POSITION.z
  );
  camera.lookAt(0, 0, 0);
}
