import { GRID_CONFIG, type GridConfig } from './grid-config';
import { rotateGridFrame } from './grid-frame';
import { advanceGridStep } from './grid-topology';
import type { GridCell, GridFrame, GridStep, TurnIntent } from './grid-types';

export function advanceGridMovement(
  cell: GridCell,
  frame: GridFrame,
  intent: TurnIntent,
  config: GridConfig = GRID_CONFIG
): Readonly<{ cell: GridCell; frame: GridFrame; step: GridStep }> {
  const nextFrame = rotateGridFrame(frame, intent);
  const step = advanceGridStep(cell, nextFrame.forward, config);
  return { cell: step.to, frame: nextFrame, step };
}
