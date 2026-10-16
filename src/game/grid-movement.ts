import { GRID_CONFIG, type GridConfig } from './grid-config';
import { rotateGridFrame } from './grid-frame';
import { advanceGridStep } from './grid-topology';
import type { GridCell, GridFrame, GridStep, TurnIntent } from './grid-types';

export const TURN_QUEUE_CAPACITY = 2;

type QueuedTurnIntent = Exclude<TurnIntent, 'none'>;

export class TurnIntentQueue {
  private readonly intents: QueuedTurnIntent[] = [];

  enqueue(intent: QueuedTurnIntent): boolean {
    if (this.intents.length >= TURN_QUEUE_CAPACITY) return false;
    this.intents.push(intent);
    return true;
  }

  shift(): TurnIntent {
    return this.intents.shift() ?? 'none';
  }

  clear(): void {
    this.intents.length = 0;
  }

  get size(): number {
    return this.intents.length;
  }
}

export class GridMovementClock {
  private progress = 0;

  constructor(readonly stepsPerSecond: number) {
    if (!Number.isFinite(stepsPerSecond) || stepsPerSecond <= 0) {
      throw new RangeError('stepsPerSecond must be finite and > 0');
    }
  }

  consume(dtSeconds: number, onStep: () => void): number {
    if (!Number.isFinite(dtSeconds) || dtSeconds < 0) {
      throw new RangeError('dtSeconds must be finite and >= 0');
    }

    this.progress += dtSeconds * this.stepsPerSecond;
    const steps = Math.floor(this.progress + 1e-10);
    this.progress = Math.max(0, this.progress - steps);

    for (let i = 0; i < steps; i += 1) onStep();
    return steps;
  }

  get alpha(): number {
    return Math.min(1 - Number.EPSILON, Math.max(0, this.progress));
  }

  reset(): void {
    this.progress = 0;
  }
}

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
