import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { GRID_CONFIG } from '../../src/game/grid-config';
import {
  CAMERA_DISTANCE_CELLS,
  CAMERA_FOV,
  CAMERA_HEIGHT_CELLS,
  CAMERA_LOOK_AHEAD_CELLS,
  ChaseCameraController,
  type ChaseCameraSnapshot
} from '../../src/render/chase-camera';

function snapshot(
  forwardWorld = { x: 0, y: 0, z: 1 },
  upWorld = { x: 0, y: 1, z: 0 },
  headWorld = { x: 0, y: 0, z: 0 }
): ChaseCameraSnapshot {
  return { headWorld, forwardWorld, upWorld };
}

function finitePose(pose: ReturnType<ChaseCameraController['update']>): boolean {
  return [
    pose.position.x, pose.position.y, pose.position.z,
    pose.target.x, pose.target.y, pose.target.z
  ].every(Number.isFinite);
}

describe('SNEK CORE V3 chase camera', () => {
  it('uses the approved cell-relative baseline and 60 degree FOV', () => {
    expect(CAMERA_DISTANCE_CELLS).toBe(4);
    expect(CAMERA_HEIGHT_CELLS).toBe(2.8);
    expect(CAMERA_LOOK_AHEAD_CELLS).toBe(2);
    expect(CAMERA_FOV).toBe(60);
  });

  it('scales distance/height/look-ahead by GridConfig cellSize', () => {
    const controller = new ChaseCameraController();
    const pose = controller.update(snapshot(), 0);

    expect(pose.position.x).toBeCloseTo(0, 8);
    expect(pose.position.y).toBeCloseTo(2.8 * GRID_CONFIG.cellSize, 8);
    expect(pose.position.z).toBeCloseTo(-4 * GRID_CONFIG.cellSize, 8);
    expect(pose.target.z).toBeCloseTo(2 * GRID_CONFIG.cellSize, 8);
  });

  it.each([
    [{ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }],
    [{ x: -1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }],
    [{ x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }],
    [{ x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: -1 }],
    [{ x: 0, y: -1, z: 0 }, { x: 0, y: 0, z: 1 }],
    [{ x: 0, y: 0, z: -1 }, { x: 0, y: 1, z: 0 }]
  ])('produces a finite pose for cardinal forward/up %#', (forward, up) => {
    const controller = new ChaseCameraController();
    const pose = controller.update(snapshot(forward, up), 1 / 60);
    expect(finitePose(pose)).toBe(true);
  });

  it('keeps the same world-space camera offsets when the snake frame rotates', () => {
    const baseline = new ChaseCameraController().update(snapshot(
      { x: 0, y: 0, z: 1 },
      { x: 0, y: 1, z: 0 }
    ), 0);
    const vertical = new ChaseCameraController().update(snapshot(
      { x: 0, y: 1, z: 0 },
      { x: 0, y: 0, z: -1 }
    ), 0);
    const sideways = new ChaseCameraController().update(snapshot(
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 }
    ), 0);

    expect(vertical.position).toEqual(baseline.position);
    expect(vertical.target).toEqual(baseline.target);
    expect(sideways.position).toEqual(baseline.position);
    expect(sideways.target).toEqual(baseline.target);
  });

  it('smoothly converges toward an ordinary adjacent snapped head without overshooting', () => {
    const controller = new ChaseCameraController();
    controller.update(snapshot(), 0);

    const first = controller.update(snapshot(
      { x: 0, y: 0, z: 1 },
      { x: 0, y: 1, z: 0 },
      { x: 0.4, y: 0, z: 0 }
    ), 1 / 60);
    const second = controller.update(snapshot(
      { x: 0, y: 0, z: 1 },
      { x: 0, y: 1, z: 0 },
      { x: 0.4, y: 0, z: 0 }
    ), 1 / 60);

    expect(first.position.x).toBeGreaterThan(0);
    expect(first.position.x).toBeLessThan(0.4);
    expect(second.position.x).toBeGreaterThan(first.position.x);
    expect(second.position.x).toBeLessThan(0.4);
  });

  it('rebases its own pose across the world boundary before damping', () => {
    const controller = new ChaseCameraController();
    const edge = GRID_CONFIG.worldSize / 2 - GRID_CONFIG.cellSize / 2;

    controller.update(snapshot(
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: edge, y: 0, z: 0 }
    ), 0);

    const pose = controller.update(snapshot(
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: -edge, y: 0, z: 0 }
    ), 1 / 60);

    expect(pose.position.x).toBeLessThan(-GRID_CONFIG.worldSize / 2);
    expect(pose.target.x).toBeLessThan(-GRID_CONFIG.worldSize / 2);
  });

  it('does not treat an ordinary one-cell move as a wrap', () => {
    const controller = new ChaseCameraController();
    controller.update(snapshot(
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 0, y: 0, z: 0 }
    ), 0);

    const pose = controller.update(snapshot(
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: GRID_CONFIG.cellSize, y: 0, z: 0 }
    ), 1 / 60);

    expect(pose.position.x).toBeGreaterThan(0);
    expect(pose.position.x).toBeLessThan(GRID_CONFIG.cellSize);
  });

  it('applies the approved FOV to a supplied Three.js camera', () => {
    const camera = new THREE.PerspectiveCamera(55, 1, 0.05, 100);
    const controller = new ChaseCameraController(camera);
    controller.update(snapshot(), 0);
    expect(camera.fov).toBe(CAMERA_FOV);
  });
});
