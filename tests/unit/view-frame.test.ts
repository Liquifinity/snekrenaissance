import { describe, expect, it } from 'vitest';
import {
  INITIAL_VIEW_FRAME,
  VIEW_FRAME_SWITCH_MARGIN,
  enumerateViewFrames,
  mapViewCommand,
  selectViewFrame,
  type CameraBasis,
  type ViewFrame
} from '../../src/render/view-frame';
import type { GridDirection } from '../../src/game/grid-types';

const VECTORS: Readonly<Record<GridDirection, Readonly<{ x: number; y: number; z: number }>>> = Object.freeze({
  '+X': { x: 1, y: 0, z: 0 },
  '-X': { x: -1, y: 0, z: 0 },
  '+Y': { x: 0, y: 1, z: 0 },
  '-Y': { x: 0, y: -1, z: 0 },
  '+Z': { x: 0, y: 0, z: 1 },
  '-Z': { x: 0, y: 0, z: -1 }
});

type TestVec = Readonly<{ x: number; y: number; z: number }>;

function dot(a: TestVec, b: TestVec): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a: TestVec, b: TestVec): TestVec {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  };
}

function expectVecEqual(actual: TestVec, expected: TestVec): void {
  expect(actual.x).toBeCloseTo(expected.x, 12);
  expect(actual.y).toBeCloseTo(expected.y, 12);
  expect(actual.z).toBeCloseTo(expected.z, 12);
}

function basisAtYaw(yaw: number): CameraBasis {
  return {
    intoScreen: { x: -Math.sin(yaw), y: 0, z: -Math.cos(yaw) },
    up: { x: 0, y: 1, z: 0 },
    right: { x: Math.cos(yaw), y: 0, z: -Math.sin(yaw) }
  };
}

function basisNearPolar(polar: number): CameraBasis {
  const positionRay = { x: 0, y: Math.cos(polar), z: Math.sin(polar) };
  const intoScreen = { x: -positionRay.x, y: -positionRay.y, z: -positionRay.z };
  const right = { x: 1, y: 0, z: 0 };
  const up = cross(right, intoScreen);
  return { intoScreen, up, right };
}

function score(basis: CameraBasis, frame: ViewFrame): number {
  return dot(basis.intoScreen, VECTORS[frame.intoScreen])
    + dot(basis.up, VECTORS[frame.up])
    + dot(basis.right, VECTORS[frame.right]);
}

describe('SNEK CORE V5 ViewFrame', () => {
  it('enumerates exactly 24 unique orthogonal right-handed frames', () => {
    const frames = enumerateViewFrames();
    expect(frames).toHaveLength(24);
    expect(new Set(frames.map((frame) => `${frame.up}/${frame.right}/${frame.intoScreen}`)).size).toBe(24);

    for (const frame of frames) {
      const up = VECTORS[frame.up];
      const right = VECTORS[frame.right];
      const into = VECTORS[frame.intoScreen];
      expect(dot(up, right)).toBe(0);
      expect(dot(up, into)).toBe(0);
      expect(dot(right, into)).toBe(0);
      expectVecEqual(cross(into, up), right);
    }
  });

  it('uses the approved initial frame', () => {
    expect(INITIAL_VIEW_FRAME).toEqual({ up: '+Y', right: '+X', intoScreen: '-Z' });
    expect(VIEW_FRAME_SWITCH_MARGIN).toBe(0.15);
  });

  it('maps semantic commands through the current visual frame', () => {
    const frame: ViewFrame = { up: '+Z', right: '-X', intoScreen: '-Y' };
    expect(mapViewCommand(frame, 'up')).toBe('+Z');
    expect(mapViewCommand(frame, 'down')).toBe('-Z');
    expect(mapViewCommand(frame, 'right')).toBe('-X');
    expect(mapViewCommand(frame, 'left')).toBe('+X');
    expect(mapViewCommand(frame, 'intoScreen')).toBe('-Y');
    expect(mapViewCommand(frame, 'towardViewer')).toBe('+Y');
  });

  it('keeps the current frame when a challenger is not better by more than 0.15', () => {
    const basis = basisAtYaw(Math.PI / 4 + 0.04);
    const current = INITIAL_VIEW_FRAME;
    const selected = selectViewFrame(basis, current);
    expect(selected).toEqual(current);

    const frames = enumerateViewFrames();
    const best = [...frames].sort((a, b) => score(basis, b) - score(basis, a))[0];
    expect(best).not.toEqual(current);
    expect(score(basis, best!) - score(basis, current)).toBeLessThanOrEqual(VIEW_FRAME_SWITCH_MARGIN);
  });

  it('switches once the challenger is strictly better by more than 0.15', () => {
    const basis = basisAtYaw(Math.PI / 4 + 0.06);
    const selected = selectViewFrame(basis, INITIAL_VIEW_FRAME);
    expect(selected).toEqual({ up: '+Y', right: '-Z', intoScreen: '-X' });
    expect(score(basis, selected) - score(basis, INITIAL_VIEW_FRAME)).toBeGreaterThan(VIEW_FRAME_SWITCH_MARGIN);
  });

  it.each([Math.PI / 180, 179 * Math.PI / 180])('selects a stable valid frame near polar angle %s', (polar) => {
    const basis = basisNearPolar(polar);
    for (const vector of [basis.intoScreen, basis.up, basis.right]) {
      expect(Number.isFinite(vector.x)).toBe(true);
      expect(Number.isFinite(vector.y)).toBe(true);
      expect(Number.isFinite(vector.z)).toBe(true);
    }
    expect(enumerateViewFrames()).toContainEqual(selectViewFrame(basis, INITIAL_VIEW_FRAME));
  });
});
