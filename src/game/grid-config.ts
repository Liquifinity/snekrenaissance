export const RULESET_ID = 'pixel-flight-grid-v2-1' as const;

export type GridConfigInput = Readonly<{
  resolution: number;
  cellSize: number;
  stepsPerSecond: number;
  initialLength: number;
  growthPerFood: number;
}>;

export type GridConfig = GridConfigInput & Readonly<{
  worldSize: number;
  totalCells: number;
}>;

function requireFinitePositive(value: number, field: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${field} must be finite and > 0`);
  }
}

export function createGridConfig(input: GridConfigInput): GridConfig {
  const { resolution, cellSize, stepsPerSecond, initialLength, growthPerFood } = input;

  if (!Number.isInteger(resolution) || resolution < 2) {
    throw new RangeError('resolution must be an integer >= 2');
  }

  requireFinitePositive(cellSize, 'cellSize');
  requireFinitePositive(stepsPerSecond, 'stepsPerSecond');

  const totalCells = resolution ** 3;

  if (!Number.isInteger(initialLength) || initialLength < 1 || initialLength > totalCells) {
    throw new RangeError(`initialLength must be an integer in 1..${totalCells}`);
  }

  if (!Number.isInteger(growthPerFood) || growthPerFood < 0) {
    throw new RangeError('growthPerFood must be a non-negative integer');
  }

  return Object.freeze({
    resolution,
    cellSize,
    stepsPerSecond,
    initialLength,
    growthPerFood,
    worldSize: resolution * cellSize,
    totalCells
  });
}

export const GRID_CONFIG = createGridConfig({
  resolution: 9,
  cellSize: 0.4,
  stepsPerSecond: 6,
  initialLength: 6,
  growthPerFood: 2
});
