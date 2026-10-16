import { describe, expect, it } from 'vitest';
import { GRID_CONFIG, RULESET_ID } from '../../src/game/grid-config';

describe('GridConfig RED probe', () => {
  it('exposes the approved V2 baseline', () => {
    expect(RULESET_ID).toBe('pixel-flight-grid-v2');
    expect(GRID_CONFIG.resolution).toBe(9);
    expect(GRID_CONFIG.worldSize).toBeCloseTo(3.6, 10);
  });
});
