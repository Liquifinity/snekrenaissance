import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { GRID_CONFIG, createGridConfig } from '../../src/game/grid-config';
import {
  OVERVIEW_CAMERA_DISTANCE_MULTIPLIER,
  OVERVIEW_CAMERA_POSITION,
  applyOverviewCamera
} from '../../src/render/overview-camera';

describe('Pixel Flight Grid V2 overview camera', () => {
  it('derives the baseline front position from GridConfig worldSize', () => {
    expect(OVERVIEW_CAMERA_DISTANCE_MULTIPLIER).toBe(1.8);
    expect(OVERVIEW_CAMERA_POSITION).toEqual({
      x: 0,
      y: 0,
      z: -GRID_CONFIG.worldSize * OVERVIEW_CAMERA_DISTANCE_MULTIPLIER
    });
  });

  it('uses an alternate GridConfig instead of importing legacy WORLD_SIZE', () => {
    const config = createGridConfig({
      resolution: 10,
      cellSize: 0.25,
      stepsPerSecond: 6,
      initialLength: 6,
      growthPerFood: 2
    });
    const camera = new THREE.PerspectiveCamera();

    applyOverviewCamera(camera, config);

    expect(camera.position.x).toBe(0);
    expect(camera.position.y).toBe(0);
    expect(camera.position.z).toBeCloseTo(-config.worldSize * OVERVIEW_CAMERA_DISTANCE_MULTIPLIER, 8);
  });
});
