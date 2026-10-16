import { describe, expect, it } from 'vitest';
import {
  RENDER_SCALE,
  computeInternalRenderSize
} from '../../src/render/pixel-resolution';

describe('low-resolution pixel backing buffer', () => {
  it('uses the approved 0.50 baseline render scale', () => {
    expect(RENDER_SCALE).toBe(0.5);
  });

  it('maps 800x600 CSS pixels to a 400x300 internal framebuffer', () => {
    expect(computeInternalRenderSize(800, 600)).toEqual({ width: 400, height: 300 });
  });

  it('rounds backing dimensions deterministically and never returns below 1x1', () => {
    expect(computeInternalRenderSize(803, 601)).toEqual({ width: 402, height: 301 });
    expect(computeInternalRenderSize(0, 0)).toEqual({ width: 1, height: 1 });
    expect(computeInternalRenderSize(1, 1)).toEqual({ width: 1, height: 1 });
  });

  it('is independent from devicePixelRatio because DPR is not an input', () => {
    const size = computeInternalRenderSize(390, 844, 0.5);
    expect(size).toEqual({ width: 195, height: 422 });
  });

  it.each([
    [-1, 100, 0.5, 'cssWidth'],
    [100, -1, 0.5, 'cssHeight'],
    [Number.NaN, 100, 0.5, 'cssWidth'],
    [100, Number.POSITIVE_INFINITY, 0.5, 'cssHeight'],
    [100, 100, 0, 'scale'],
    [100, 100, -0.5, 'scale'],
    [100, 100, 1.1, 'scale'],
    [100, 100, Number.NaN, 'scale']
  ])('rejects invalid backing-buffer input %#', (width, height, scale, field) => {
    expect(() => computeInternalRenderSize(width, height, scale)).toThrow(field);
  });
});
