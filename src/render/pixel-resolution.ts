export const RENDER_SCALE = 0.5;

export type InternalRenderSize = Readonly<{
  width: number;
  height: number;
}>;

function requireFiniteNonNegative(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${field} must be finite and >= 0`);
  }
}

export function computeInternalRenderSize(
  cssWidth: number,
  cssHeight: number,
  scale = RENDER_SCALE
): InternalRenderSize {
  requireFiniteNonNegative(cssWidth, 'cssWidth');
  requireFiniteNonNegative(cssHeight, 'cssHeight');

  if (!Number.isFinite(scale) || scale <= 0 || scale > 1) {
    throw new RangeError('scale must be finite and in (0, 1]');
  }

  return Object.freeze({
    width: Math.max(1, Math.round(cssWidth * scale)),
    height: Math.max(1, Math.round(cssHeight * scale))
  });
}
