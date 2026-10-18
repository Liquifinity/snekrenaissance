import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { GRID_CONFIG } from '../../src/game/grid-config';
import { ChaseCameraController, type ChaseCameraSnapshot } from '../../src/render/chase-camera';
import { OVERVIEW_CAMERA_DISTANCE_MULTIPLIER, applyOverviewCamera } from '../../src/render/overview-camera';

const snapshot: ChaseCameraSnapshot = {
  headWorld: { x: 0, y: 0, z: 0 },
  forwardWorld: { x: 0, y: 0, z: 1 },
  upWorld: { x: 0, y: 1, z: 0 }
};

describe('SNEK CORE V3 camera zoom', () => {
  it('scales chase distance/height and clamps zoom to the approved 0.65..5 range', () => {
    const controller = new ChaseCameraController();
    const zoomable = controller as unknown as {
      zoomFactor?: number;
      setZoomFactor?: (factor: number) => void;
    };

    expect(typeof zoomable.setZoomFactor).toBe('function');
    if (typeof zoomable.setZoomFactor !== 'function') return;

    zoomable.setZoomFactor(2);
    expect(zoomable.zoomFactor).toBe(2);
    let pose = controller.update(snapshot, 0);
    expect(pose.position.y).toBeCloseTo(2.8 * GRID_CONFIG.cellSize * 2, 8);
    expect(pose.position.z).toBeCloseTo(-4 * GRID_CONFIG.cellSize * 2, 8);

    zoomable.setZoomFactor(100);
    expect(zoomable.zoomFactor).toBe(5);
    controller.reset();
    pose = controller.update(snapshot, 0);
    expect(pose.position.z).toBeCloseTo(-4 * GRID_CONFIG.cellSize * 5, 8);

    zoomable.setZoomFactor(0.01);
    expect(zoomable.zoomFactor).toBe(0.65);
  });

  it('applies the same zoom factor to overview camera distance', () => {
    const camera = new THREE.PerspectiveCamera();
    const applyZoomableOverview = applyOverviewCamera as unknown as (
      camera: THREE.PerspectiveCamera,
      config: typeof GRID_CONFIG,
      zoomFactor: number
    ) => void;

    applyZoomableOverview(camera, GRID_CONFIG, 2);

    expect(camera.position.z).toBeCloseTo(
      -GRID_CONFIG.worldSize * OVERVIEW_CAMERA_DISTANCE_MULTIPLIER * 2,
      8
    );
  });
});
