import type { PerspectiveCamera } from 'three';
import { WORLD_SIZE } from '../game/constants';

export const OVERVIEW_CAMERA_POSITION = {
  x: 0,
  y: 0,
  z: -WORLD_SIZE * 1.8
} as const;

export function applyOverviewCamera(camera: PerspectiveCamera): void {
  camera.position.set(
    OVERVIEW_CAMERA_POSITION.x,
    OVERVIEW_CAMERA_POSITION.y,
    OVERVIEW_CAMERA_POSITION.z
  );
  camera.lookAt(0, 0, 0);
}
