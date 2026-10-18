import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { GRID_CONFIG } from '../../src/game/grid-config';
import type { CameraBasis } from '../../src/render/view-frame';

type Vec = Readonly<{ x: number; y: number; z: number }>;
type Pose = Readonly<{ position: Vec; target: Vec; distance: number; basis: CameraBasis }>;

type BoardCameraModule = {
  BOARD_CAMERA_FOV: number;
  BOARD_CAMERA_FRAMING_MARGIN: number;
  BOARD_CAMERA_ZOOM_MIN: number;
  BOARD_CAMERA_ZOOM_MAX: number;
  BOARD_CAMERA_ZOOM_DEFAULT: number;
  BOARD_CAMERA_POLAR_MIN: number;
  BOARD_CAMERA_POLAR_MAX: number;
  computeBoardCameraDistance: (config: typeof GRID_CONFIG, aspect: number, fovDegrees?: number) => number;
  BoardCameraController: new (camera?: THREE.PerspectiveCamera, config?: typeof GRID_CONFIG) => {
    readonly zoomFactor: number;
    setZoomFactor: (factor: number) => void;
    orbitBy: (deltaAzimuth: number, deltaPolar: number) => void;
    apply: (aspect?: number) => Pose;
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

function normalized(value: Vec): Vec {
  const length = Math.hypot(value.x, value.y, value.z);
  return { x: value.x / length, y: value.y / length, z: value.z / length };
}

function expectVecClose(actual: Vec, expected: Vec, digits = 10): void {
  expect(actual.x).toBeCloseTo(expected.x, digits);
  expect(actual.y).toBeCloseTo(expected.y, digits);
  expect(actual.z).toBeCloseTo(expected.z, digits);
}

function dot(a: Vec, b: Vec): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

const EXPECTED_RAY = normalized({ x: 0.65, y: 0.55, z: 1.0 });

describe('SNEK CORE V5 persistent board orbit camera', () => {
  it('exports approved framing, zoom and polar limits', async () => {
    const module = await loadBoardCamera();
    expect(module).not.toBeNull();
    if (!module) return;
    expect(module.BOARD_CAMERA_FOV).toBe(60);
    expect(module.BOARD_CAMERA_FRAMING_MARGIN).toBe(1.10);
    expect(module.BOARD_CAMERA_ZOOM_MIN).toBe(0.65);
    expect(module.BOARD_CAMERA_ZOOM_MAX).toBe(5);
    expect(module.BOARD_CAMERA_ZOOM_DEFAULT).toBe(1);
    expect(module.BOARD_CAMERA_POLAR_MIN).toBeCloseTo(Math.PI / 180, 12);
    expect(module.BOARD_CAMERA_POLAR_MAX).toBeCloseTo(179 * Math.PI / 180, 12);
  });

  it.each([16 / 9, 9 / 16, 1])('starts on the approved V4 ray at aspect %s', async (aspect) => {
    const module = await loadBoardCamera();
    expect(module).not.toBeNull();
    if (!module) return;
    const pose = new module.BoardCameraController().apply(aspect);
    expectVecClose(normalized(pose.position), EXPECTED_RAY);
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

  it('orbits continuously around the fixed target without changing distance', async () => {
    const module = await loadBoardCamera();
    expect(module).not.toBeNull();
    if (!module) return;
    const controller = new module.BoardCameraController();
    const before = controller.apply(1);
    controller.orbitBy(Math.PI / 3, 0.2);
    const after = controller.apply(1);

    expect(after.target).toEqual({ x: 0, y: 0, z: 0 });
    expect(after.distance).toBeCloseTo(before.distance, 10);
    expect(normalized(after.position)).not.toEqual(normalized(before.position));

    const stable = controller.apply(1);
    expectVecClose(normalized(stable.position), normalized(after.position));
    expect(stable.distance).toBeCloseTo(after.distance, 10);
  });

  it('clamps polar orbit at 1° and 179° and keeps a finite orthonormal basis', async () => {
    const module = await loadBoardCamera();
    expect(module).not.toBeNull();
    if (!module) return;
    const controller = new module.BoardCameraController();

    controller.orbitBy(0, -100);
    const top = controller.apply(1);
    expect(normalized(top.position).y).toBeCloseTo(Math.cos(module.BOARD_CAMERA_POLAR_MIN), 10);

    controller.orbitBy(0, 100);
    const bottom = controller.apply(1);
    expect(normalized(bottom.position).y).toBeCloseTo(Math.cos(module.BOARD_CAMERA_POLAR_MAX), 10);

    for (const vector of [bottom.basis.intoScreen, bottom.basis.up, bottom.basis.right]) {
      expect(Number.isFinite(vector.x)).toBe(true);
      expect(Number.isFinite(vector.y)).toBe(true);
      expect(Number.isFinite(vector.z)).toBe(true);
      expect(Math.hypot(vector.x, vector.y, vector.z)).toBeCloseTo(1, 10);
    }
    expect(dot(bottom.basis.intoScreen, bottom.basis.up)).toBeCloseTo(0, 10);
    expect(dot(bottom.basis.intoScreen, bottom.basis.right)).toBeCloseTo(0, 10);
    expect(dot(bottom.basis.up, bottom.basis.right)).toBeCloseTo(0, 10);
  });

  it('zoom changes scalar distance without changing a non-default orbit orientation', async () => {
    const module = await loadBoardCamera();
    expect(module).not.toBeNull();
    if (!module) return;
    const controller = new module.BoardCameraController();
    controller.orbitBy(0.7, -0.3);
    const before = controller.apply(1);
    controller.setZoomFactor(100);
    expect(controller.zoomFactor).toBe(5);
    const far = controller.apply(1);
    expect(far.distance).toBeCloseTo(before.distance * 5, 10);
    expectVecClose(normalized(far.position), normalized(before.position));
    controller.setZoomFactor(0.01);
    expect(controller.zoomFactor).toBe(0.65);
  });

  it('resize recomputes distance without changing current orbit ray or stored zoom', async () => {
    const module = await loadBoardCamera();
    expect(module).not.toBeNull();
    if (!module) return;
    const camera = new THREE.PerspectiveCamera(55, 16 / 9, 0.05, 100);
    const controller = new module.BoardCameraController(camera);
    controller.orbitBy(-0.9, 0.25);
    controller.setZoomFactor(2);
    const landscape = controller.apply(16 / 9);
    const portrait = controller.apply(9 / 16);
    expect(controller.zoomFactor).toBe(2);
    expectVecClose(normalized(portrait.position), normalized(landscape.position));
    expect(portrait.distance).not.toBeCloseTo(landscape.distance, 8);
    expect(camera.fov).toBe(60);
  });

  it('rejects invalid aspect, zoom and orbit inputs', async () => {
    const module = await loadBoardCamera();
    expect(module).not.toBeNull();
    if (!module) return;
    expect(() => module.computeBoardCameraDistance(GRID_CONFIG, 0)).toThrow(RangeError);
    expect(() => module.computeBoardCameraDistance(GRID_CONFIG, Number.NaN)).toThrow(RangeError);
    const controller = new module.BoardCameraController();
    expect(() => controller.setZoomFactor(0)).toThrow(RangeError);
    expect(() => controller.setZoomFactor(Number.NaN)).toThrow(RangeError);
    expect(() => controller.orbitBy(Number.NaN, 0)).toThrow(RangeError);
    expect(() => controller.orbitBy(0, Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});
