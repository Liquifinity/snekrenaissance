import { describe, expect, it } from 'vitest';
import { FOOD_RADIUS } from '../../src/render/food-renderer';
import {
  CUBE_GUIDE_OPACITY,
  CUBE_WALL_STYLE,
  PALETTE
} from '../../src/render/scene';
import { BODY_RADIUS, HEAD_RADIUS } from '../../src/render/snake-renderer';

function hexChannel(hex: string, offset: number): number {
  return Number.parseInt(hex.slice(offset, offset + 2), 16);
}

describe('approved render proportions', () => {
  it('keeps the head close to body scale', () => {
    expect(HEAD_RADIUS / BODY_RADIUS).toBeGreaterThanOrEqual(0.9);
    expect(HEAD_RADIUS / BODY_RADIUS).toBeLessThanOrEqual(1.15);
  });

  it('keeps food close to body scale', () => {
    expect(FOOD_RADIUS / BODY_RADIUS).toBeGreaterThanOrEqual(0.8);
    expect(FOOD_RADIUS / BODY_RADIUS).toBeLessThanOrEqual(1.2);
  });

  it('uses a readable blue tinted grid cube', () => {
    expect(CUBE_WALL_STYLE).toBe('tinted-grid');
    expect(CUBE_GUIDE_OPACITY).toBeGreaterThanOrEqual(0.45);
    expect(CUBE_GUIDE_OPACITY).toBeLessThanOrEqual(0.7);
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
