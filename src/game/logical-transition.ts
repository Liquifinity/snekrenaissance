import type { GridFrame, GridStep } from './grid-types';
import type { SnakeSegment } from './snake';

export type LogicalSnapshot = Readonly<{
  segments: readonly SnakeSegment[];
  frame: GridFrame;
}>;

export type LogicalTransition = Readonly<{
  previous: LogicalSnapshot;
  current: LogicalSnapshot;
  headStep: GridStep;
  bornSegmentId: number | null;
}>;

function freezeSegment(segment: SnakeSegment): SnakeSegment {
  return Object.freeze({
    id: segment.id,
    cell: Object.freeze({
      x: segment.cell.x,
      y: segment.cell.y,
      z: segment.cell.z
    })
  });
}

export function createLogicalSnapshot(
  segments: readonly SnakeSegment[],
  frame: GridFrame
): LogicalSnapshot {
  return Object.freeze({
    segments: Object.freeze(segments.map(freezeSegment)),
    frame: Object.freeze({
      forward: frame.forward,
      right: frame.right,
      up: frame.up
    })
  });
}

export function createLogicalTransition(
  previous: LogicalSnapshot,
  current: LogicalSnapshot,
  headStep: GridStep,
  bornSegmentId: number | null
): LogicalTransition {
  return Object.freeze({
    previous,
    current,
    headStep: Object.freeze({
      from: Object.freeze({ ...headStep.from }),
      to: Object.freeze({ ...headStep.to }),
      direction: headStep.direction,
      wrappedAxis: headStep.wrappedAxis,
      wrapSign: headStep.wrapSign
    }),
    bornSegmentId
  });
}
