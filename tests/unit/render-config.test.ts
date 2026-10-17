import { describe, expect, it } from 'vitest';
import { GRID_CONFIG } from '../../src/game/grid-config';
import { FOOD_VOXEL_SIZE } from '../../src/render/food-renderer';
import {
  CUBE_GRID_DIVISIONS,
  CUBE_GUIDE_OPACITY,
  CUBE_WALL_STYLE,
  PALETTE,
  RENDERER_ANTIALIAS,
  RENDERER_PIXEL_RATIO
} from '../../src/render/scene';
import { HEAD_VOXEL_SIZE, SNAKE_VOXEL_SIZE } from '../../src/render/snake-renderer';

function hexChannel(hex: string, offset: number): number {
  return Number.parseInt(hex.slice(offset, offset + 2), 16);
}

describe('approved V2 render proportions', () => {
  it('keeps head and body on the same voxel footprint', () => {
    expect(HEAD_VOXEL_SIZE / SNAKE_VOXEL_SIZE).toBeCloseTo(1, 8);
  });

  it('keeps food smaller than the snake voxel for cell legibility', () => {
    expect(FOOD_VOXEL_SIZE).toBeLessThan(SNAKE_VOXEL_SIZE);
    expect(FOOD_VOXEL_SIZE / GRID_CONFIG.cellSize).toBeCloseTo(0.6, 8);
  });

  it('uses the logical resolution as the visible grid resolution', () => {
    expect(CUBE_GRID_DIVISIONS).toBe(GRID_CONFIG.resolution);
    expect(CUBE_WALL_STYLE).toBe('tinted-grid');
    expect(CUBE_GUIDE_OPACITY).toBeGreaterThanOrEqual(0.45);
    expect(CUBE_GUIDE_OPACITY).toBeLessThanOrEqual(0.7);
  });

  it('uses AA-off and a logical pixel ratio of one for the low-resolution pipeline', () => {
    expect(RENDERER_ANTIALIAS).toBe(false);
    expect(RENDERER_PIXEL_RATIO).toBe(1);
  });

  it('exports a near-white background and blue guides/accent', () => {
    expect(PALETTE.background).toMatch(/^#[0-9a-f]{6}$/i);
    expect(PALETTE.guides).toMatch(/^#[0-9a-f]{6}$/i);
    expect(PALETTE.accent).toMatch(/^#[0-9a-f]{6}$/i);

    const bg = PALETTE.background;
    expect(hexChannel(bg, 1)).toBeGreaterThanOrEqual(245);
    expect(hexChannel(bg, 3)).toBeGreaterThanOrEqual(245);
    expect(hexChannel(bg, 5)).toBeGreaterThanOrEqual(245);

    const guides = PALETTE.guides;
    expect(hexChannel(guides, 5)).toBeGreaterThan(hexChannel(guides, 1));

    const accent = PALETTE.accent;
    const r = hexChannel(accent, 1);
    const g = hexChannel(accent, 3);
    const b = hexChannel(accent, 5);
    expect(b).toBeGreaterThan(r);
    expect(b).toBeGreaterThanOrEqual(g);
  });
});
