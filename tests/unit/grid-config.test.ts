import { describe, expect, it } from 'vitest';
import {
  GRID_CONFIG,
  createGridConfig
} from '../../src/game/grid-config';

describe('current grid config', () => {
  it('derives the approved baseline configuration', () => {
    expect(GRID_CONFIG.resolution).toBe(9);
    expect(GRID_CONFIG.cellSize).toBe(0.4);
    expect(GRID_CONFIG.worldSize).toBeCloseTo(3.6, 10);
    expect(GRID_CONFIG.totalCells).toBe(729);
    expect(GRID_CONFIG.stepsPerSecond).toBe(6);
    expect(GRID_CONFIG.initialLength).toBe(6);
    expect(GRID_CONFIG.growthPerFood).toBe(2);
  });

  it('derives worldSize and totalCells instead of accepting them as inputs', () => {
    const config = createGridConfig({
      resolution: 10,
      cellSize: 0.25,
      stepsPerSecond: 5,
      initialLength: 7,
      growthPerFood: 3
    });
    expect(config.worldSize).toBe(2.5);
    expect(config.totalCells).toBe(1000);
  });

  it.each([
    [{ resolution: 1, cellSize: 0.4, stepsPerSecond: 6, initialLength: 1, growthPerFood: 0 }, 'resolution'],
    [{ resolution: 2.5, cellSize: 0.4, stepsPerSecond: 6, initialLength: 1, growthPerFood: 0 }, 'resolution'],
    [{ resolution: 9, cellSize: 0, stepsPerSecond: 6, initialLength: 1, growthPerFood: 0 }, 'cellSize'],
    [{ resolution: 9, cellSize: Number.NaN, stepsPerSecond: 6, initialLength: 1, growthPerFood: 0 }, 'cellSize'],
    [{ resolution: 9, cellSize: 0.4, stepsPerSecond: 0, initialLength: 1, growthPerFood: 0 }, 'stepsPerSecond'],
    [{ resolution: 9, cellSize: 0.4, stepsPerSecond: Number.POSITIVE_INFINITY, initialLength: 1, growthPerFood: 0 }, 'stepsPerSecond'],
    [{ resolution: 9, cellSize: 0.4, stepsPerSecond: 6, initialLength: 0, growthPerFood: 0 }, 'initialLength'],
    [{ resolution: 2, cellSize: 0.4, stepsPerSecond: 6, initialLength: 9, growthPerFood: 0 }, 'initialLength'],
    [{ resolution: 9, cellSize: 0.4, stepsPerSecond: 6, initialLength: 6, growthPerFood: -1 }, 'growthPerFood'],
    [{ resolution: 9, cellSize: 0.4, stepsPerSecond: 6, initialLength: 6, growthPerFood: 1.5 }, 'growthPerFood']
  ])('rejects invalid config input: %s', (input, field) => {
    expect(() => createGridConfig(input)).toThrow(field);
  });
});
