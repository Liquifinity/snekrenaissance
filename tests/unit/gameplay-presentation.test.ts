import { describe, expect, it } from 'vitest';
import { GRID_CONFIG } from '../../src/game/grid-config';
import {
  FOOD_VOXEL_FILL,
  FOOD_VOXEL_SIZE
} from '../../src/render/food-renderer';
import * as sceneModule from '../../src/render/scene';
import {
  HEAD_VOXEL_SIZE,
  SNAKE_VOXEL_FILL,
  SNAKE_VOXEL_SIZE
} from '../../src/render/snake-renderer';

describe('Pixel Flight Grid V2 presentation contract', () => {
  it('derives aligned voxel footprints directly from GridConfig cell size', () => {
    expect(SNAKE_VOXEL_FILL).toBe(0.8);
    expect(FOOD_VOXEL_FILL).toBe(0.8);
    expect(SNAKE_VOXEL_SIZE).toBeCloseTo(GRID_CONFIG.cellSize * 0.8, 8);
    expect(HEAD_VOXEL_SIZE).toBeCloseTo(SNAKE_VOXEL_SIZE, 8);
    expect(FOOD_VOXEL_SIZE).toBeCloseTo(GRID_CONFIG.cellSize * 0.8, 8);
    expect(SNAKE_VOXEL_SIZE).toBeCloseTo(0.32, 8);
    expect(FOOD_VOXEL_SIZE).toBeCloseTo(0.32, 8);
  });

  it('binds the visible cube grid exactly to the logical grid resolution', () => {
    expect(GRID_CONFIG.resolution).toBe(9);
    expect(GRID_CONFIG.worldSize).toBeCloseTo(3.6, 8);
    expect(sceneModule.CUBE_GRID_DIVISIONS).toBe(GRID_CONFIG.resolution);
    expect(sceneModule.CUBE_GRID_FACE_COUNT).toBe(6);
    expect(sceneModule.CUBE_WALL_STYLE).toBe('tinted-grid');
  });

  it('preserves the approved blue-white legibility language', () => {
    expect(sceneModule.PALETTE.background).toBe('#ffffff');
    expect(sceneModule.PALETTE.guides).toBe('#93c5fd');
    expect(sceneModule.PALETTE.accent).toBe('#3b82f6');
    expect(sceneModule.CUBE_GUIDE_OPACITY).toBeGreaterThanOrEqual(0.45);
    expect(sceneModule.CUBE_FACE_TINT_OPACITY).toBeGreaterThan(0);
  });
});
