import type { GridDirection } from './grid-types';

const OPPOSITE_GRID_DIRECTION: Readonly<Record<GridDirection, GridDirection>> = Object.freeze({
  '+X': '-X',
  '-X': '+X',
  '+Y': '-Y',
  '-Y': '+Y',
  '+Z': '-Z',
  '-Z': '+Z'
});

export function oppositeGridDirection(direction: GridDirection): GridDirection {
  return OPPOSITE_GRID_DIRECTION[direction];
}

export function isOppositeGridDirection(a: GridDirection, b: GridDirection): boolean {
  return oppositeGridDirection(a) === b;
}
