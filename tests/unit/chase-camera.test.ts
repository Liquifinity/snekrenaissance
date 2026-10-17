import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { forwardVector, type FlightPose } from '../../src/game/flight';
import { GRID_CONFIG } from '../../src/game/grid-config';
import {
  CAMERA_DISTANCE_CELLS,
  CAMERA_FOV,
  CAMERA_HEIGHT_CELLS,
  CAMERA_LOOK_AHEAD_CELLS,
  ChaseCameraController
} from '../../src/render/chase-camera';
import { interpolateFlightPresentation } from '../../src/render/flight-presentation';

const zero = { x: 0, y: 0, z: 0 };

function snapshot(
  forwardWorld = { x: 0, y: 0, z: 1 },
  upWorld = { x: 0, y: 1, z: 0 },
  headWorld = { x: 0, y: 0, z: 0 },
  displayWrapOffset = zero
) {
  return { headWorld, forwardWorld, upWorld, displayWrapOffset };
}

function continuousPresentation(yaw: number, pitch = 0) {
  const orientation = { yaw, pitch, roll: 0 } as const;
  const flight: FlightPose = {
    unwrappedPosition: { x: 4.5, y: 4.5, z: 4.5 },
    wrappedPosition: { x: 4.5, y: 4.5, z: 4.5 },
    orientation,
    forward: forwardVector(orientation)
  };
  return interpolateFlightPresentation(flight, flight, 1, GRID_CONFIG);
}

function finitePose(pose: ReturnType<ChaseCameraController['update']>): boolean {
  return [
    pose.position.x, pose.position.y, pose.position.z,
    pose.target.x, pose.target.y, pose.target.z
  ].every(Number.isFinite);
}

describe('continuous flight chase camera', () => {
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

  it('tracks a small continuous yaw without snapping to a cardinal axis', () => {
    const controller = new ChaseCameraController();
    const presentation = continuousPresentation(Math.PI / 36);
    const pose = controller.update(presentation, 0);

    expect(finitePose(pose)).toBe(true);
    expect(Math.abs(pose.position.x)).toBeGreaterThan(0);
    expect(Math.abs(pose.position.x)).toBeLessThan(GRID_CONFIG.cellSize * 0.5);
    expect(pose.position.z).toBeLessThan(-1.5);
    expect(pose.target.x).toBeGreaterThan(0);
  });

  it('tracks a small continuous pitch through interpolated forward/up vectors', () => {
    const controller = new ChaseCameraController();
    const presentation = continuousPresentation(0, Math.PI / 36);
    const pose = controller.update(presentation, 0);

    expect(finitePose(pose)).toBe(true);
    expect(pose.target.y).toBeGreaterThan(0);
    expect(pose.position.y).toBeLessThan(CAMERA_HEIGHT_CELLS * GRID_CONFIG.cellSize);
    expect(pose.position.z).toBeLessThan(0);
  });

  it('uses interpolated local up instead of assuming world +Y', () => {
    const controller = new ChaseCameraController();
    const pose = controller.update(snapshot(
      { x: 0, y: 1, z: 0 },
      { x: 0, y: 0, z: -1 }
    ), 0);

    expect(pose.position.y).toBeLessThan(0);
    expect(pose.position.z).toBeLessThan(0);
    expect(pose.target.y).toBeGreaterThan(0);
  });

  it.each([
    [{ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }],
    [{ x: -1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }],
    [{ x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: -1 }],
    [{ x: 0, y: -1, z: 0 }, { x: 0, y: 0, z: 1 }],
    [{ x: 0, y: 0, z: 1 }, { x: 0, y: 1, z: 0 }],
    [{ x: 0, y: 0, z: -1 }, { x: 0, y: 1, z: 0 }]
  ])('produces a finite pose for forward=%o', (forward, up) => {
    const controller = new ChaseCameraController();
    const pose = controller.update(snapshot(forward, up), 1 / 60);
    expect(finitePose(pose)).toBe(true);

    const relative = {
      x: pose.position.x,
      y: pose.position.y,
      z: pose.position.z
    };
    const behindDot = relative.x * forward.x + relative.y * forward.y + relative.z * forward.z;
    expect(behindDot).toBeLessThan(0);
  });

  it('keeps the camera outside the head voxel at baseline framing', () => {
    const controller = new ChaseCameraController();
    const pose = controller.update(snapshot(), 0);
    const distance = Math.hypot(pose.position.x, pose.position.y, pose.position.z);
    expect(distance).toBeGreaterThan(GRID_CONFIG.cellSize * 0.8);
  });

  it('smoothly converges toward ordinary head motion without overshooting', () => {
    const controller = new ChaseCameraController();
    controller.update(snapshot(), 1 / 60);

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

  it('relocates by displayWrapOffset before damping instead of smoothing through the cube', () => {
    const controller = new ChaseCameraController();
    const half = GRID_CONFIG.worldSize / 2;

    controller.update(snapshot(
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: half - 0.01, y: 0, z: 0 },
      zero
    ), 1 / 60);

    const pose = controller.update(snapshot(
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: half + 0.01, y: 0, z: 0 },
      { x: -GRID_CONFIG.worldSize, y: 0, z: 0 }
    ), 1 / 60);

    expect(pose.position.x).toBeLessThan(-1);
    expect(pose.target.x).toBeLessThan(0);
  });

  it('applies the approved FOV to a supplied Three.js camera', () => {
    const camera = new THREE.PerspectiveCamera(55, 1, 0.05, 100);
    const controller = new ChaseCameraController(camera);
    controller.update(snapshot(), 0);
    expect(camera.fov).toBe(CAMERA_FOV);
  });
});
