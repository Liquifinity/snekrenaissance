import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { GRID_CONFIG } from '../../src/game/grid-config';

type BoardCameraModule = {
  BOARD_CAMERA_FOV: number;
  BOARD_CAMERA_FRAMING_MARGIN: number;
  BOARD_CAMERA_ZOOM_MIN: number;
  BOARD_CAMERA_ZOOM_MAX: number;
  BOARD_CAMERA_ZOOM_DEFAULT: number;
  computeBoardCameraDistance: (config: typeof GRID_CONFIG, aspect: number, fovDegrees?: number) => number;
  BoardCameraController: new (camera?: THREE.PerspectiveCamera, config?: typeof GRID_CONFIG) => {
    readonly zoomFactor: number;
    setZoomFactor: (factor: number) => void;
    apply: (aspect?: number) => Readonly<{
      position: Readonly<{ x: number; y: number; z: number }>;
      target: Readonly<{ x: number; y: number; z: number }>;
      distance: number;
    }>;
  };
};

async function loadBoardCamera(): Promise<BoardCameraModule | null> {
  try {
    const path = '../../src/render/' + 'board-camera';
    return await import(path) as BoardCameraModule;
  } catch {
    return null;
  }
}

function normalized(value: Readonly<{ x: number; y: number; z: number }>) {
  const length = Math.hypot(value.x, value.y, value.z);
  return { x: value.x / length, y: value.y / length, z: value.z / length };
}

const EXPECTED_RAY = normalized({ x: 0.65, y: 0.55, z: 1.0 });

describe('SNEK CORE V4 fixed board camera', () => {
  it('exports the approved FOV, framing margin and zoom range', async () => {
    const module = await loadBoardCamera();
    expect(module).not.toBeNull();
    if (!module) return;
    expect(module.BOARD_CAMERA_FOV).toBe(60);
    expect(module.BOARD_CAMERA_FRAMING_MARGIN).toBe(1.10);
    expect(module.BOARD_CAMERA_ZOOM_MIN).toBe(0.65);
    expect(module.BOARD_CAMERA_ZOOM_MAX).toBe(5);
    expect(module.BOARD_CAMERA_ZOOM_DEFAULT).toBe(1);
  });

  it.each([16 / 9, 9 / 16, 1])('keeps the approved fixed ray at aspect %s', async (aspect) => {
    const module = await loadBoardCamera();
    expect(module).not.toBeNull();
    if (!module) return;
    const controller = new module.BoardCameraController();
    const pose = controller.apply(aspect);
    const ray = normalized(pose.position);
    expect(ray.x).toBeCloseTo(EXPECTED_RAY.x, 10);
    expect(ray.y).toBeCloseTo(EXPECTED_RAY.y, 10);
    expect(ray.z).toBeCloseTo(EXPECTED_RAY.z, 10);
    expect(pose.target).toEqual({ x: 0, y: 0, z: 0 });
  });

  it.each([16 / 9, 9 / 16, 1])('fits the cube bounding sphere plus 1.10 margin at aspect %s', async (aspect) => {
    const module = await loadBoardCamera();
    expect(module).not.toBeNull();
    if (!module) return;
    const verticalHalfFov = (60 * Math.PI / 180) / 2;
    const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * aspect);
    const limitingHalfFov = Math.min(verticalHalfFov, horizontalHalfFov);
    const cubeRadius = Math.sqrt(3) * GRID_CONFIG.worldSize / 2;
    const expected = cubeRadius / Math.sin(limitingHalfFov) * 1.10;
    expect(module.computeBoardCameraDistance(GRID_CONFIG, aspect)).toBeCloseTo(expected, 10);
  });

  it('clamps manual zoom and changes only scalar distance', async () => {
    const module = await loadBoardCamera();
    expect(module).not.toBeNull();
    if (!module) return;
    const controller = new module.BoardCameraController();
    const baseline = controller.apply(1);
    controller.setZoomFactor(100);
    expect(controller.zoomFactor).toBe(5);
    const far = controller.apply(1);
    expect(far.distance).toBeCloseTo(baseline.distance * 5, 10);
    expect(normalized(far.position)).toEqual(normalized(baseline.position));
    controller.setZoomFactor(0.01);
    expect(controller.zoomFactor).toBe(0.65);
  });

  it('resize recomputes distance without changing ray or stored zoom', async () => {
    const module = await loadBoardCamera();
    expect(module).not.toBeNull();
    if (!module) return;
    const camera = new THREE.PerspectiveCamera(55, 16 / 9, 0.05, 100);
    const controller = new module.BoardCameraController(camera);
    controller.setZoomFactor(2);
    const landscape = controller.apply(16 / 9);
    const portrait = controller.apply(9 / 16);
    expect(controller.zoomFactor).toBe(2);
    expect(normalized(portrait.position)).toEqual(normalized(landscape.position));
    expect(portrait.distance).not.toBeCloseTo(landscape.distance, 8);
    expect(camera.fov).toBe(60);
  });

  it('rejects invalid aspect and zoom inputs', async () => {
    const module = await loadBoardCamera();
    expect(module).not.toBeNull();
    if (!module) return;
    expect(() => module.computeBoardCameraDistance(GRID_CONFIG, 0)).toThrow(RangeError);
    expect(() => module.computeBoardCameraDistance(GRID_CONFIG, Number.NaN)).toThrow(RangeError);
    const controller = new module.BoardCameraController();
    expect(() => controller.setZoomFactor(0)).toThrow(RangeError);
    expect(() => controller.setZoomFactor(Number.NaN)).toThrow(RangeError);
  });
});
