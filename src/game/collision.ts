import { GRID_CONFIG, type GridConfig } from './grid-config';
import { cellKey } from './grid-topology';
import type { GridCell } from './grid-types';
import type { GridSnakeState } from './snake';

export function wouldSelfCollide(
  state: GridSnakeState,
  nextHead: GridCell,
  config: GridConfig = GRID_CONFIG
): boolean {
  const targetKey = cellKey(nextHead, config);
  const tailIndex = state.segments.length - 1;

  for (let index = 0; index < state.segments.length; index += 1) {
    const segment = state.segments[index];
    if (cellKey(segment.cell, config) !== targetKey) continue;

    const isVacatingTail = index === tailIndex && state.pendingGrowth === 0;
    if (isVacatingTail) continue;
    return true;
  }

  return false;
}
