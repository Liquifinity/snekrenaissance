import { describe, expect, it } from 'vitest';
import {
  FOOD_PICKUP_RADIUS,
  SEGMENT_SPACING,
  SELF_COLLISION_RADIUS,
  WORLD_SIZE
} from '../../src/game/constants';
import { FOOD_RADIUS } from '../../src/render/food-renderer';
import * as sceneModule from '../../src/render/scene';
import { BODY_RADIUS, HEAD_RADIUS } from '../../src/render/snake-renderer';

// Approved presentation correction: compact play objects, denser arena grid, compressed cube.
describe('gameplay presentation contract', () => {
  it('keeps the compact snake but doubles the current food size', () => {
    expect(BODY_RADIUS).toBeCloseTo(0.16 / 3, 8);
    expect(HEAD_RADIUS).toBeCloseTo(0.17 / 3, 8);
    expect(FOOD_RADIUS).toBeCloseTo((0.16 / 3) * 2, 8);
    expect(SEGMENT_SPACING).toBeCloseTo(0.42 / 3, 8);
  });

  it('shrinks self collision while keeping the larger food pickup tolerance', () => {
    expect(SELF_COLLISION_RADIUS).toBeCloseTo(0.3 / 3, 8);
    expect(FOOD_PICKUP_RADIUS).toBeCloseTo(0.3, 8);
    expect(FOOD_PICKUP_RADIUS).toBeGreaterThan(HEAD_RADIUS + FOOD_RADIUS);
  });

  it('compresses the cube to half the previous size and keeps the six-face grid dense', () => {
    expect(WORLD_SIZE).toBe(4);
    expect(sceneModule.CUBE_WALL_STYLE).toBe('tinted-grid');
    expect(sceneModule.PALETTE.guides).toBe('#93c5fd');
    expect(sceneModule.CUBE_GUIDE_OPACITY).toBeGreaterThanOrEqual(0.45);
    expect(sceneModule.CUBE_GRID_FACE_COUNT).toBe(6);
    expect(sceneModule.CUBE_GRID_DIVISIONS).toBeGreaterThanOrEqual(24);
    expect(sceneModule.CUBE_FACE_TINT_OPACITY).toBeGreaterThan(0);
  });
});
