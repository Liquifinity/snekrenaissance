import { INITIAL_BODY_SEGMENTS, SEGMENT_SPACING } from './constants';
import type { TrailBuffer } from './trail';
import type { Vec3 } from './types';

export type SnakeState = {
  segmentCount: number;
  segmentSpacing: number;
};

export function createSnakeState(
  segmentCount = INITIAL_BODY_SEGMENTS,
  segmentSpacing = SEGMENT_SPACING
): SnakeState {
  if (!Number.isInteger(segmentCount) || segmentCount < 0) {
    throw new RangeError('Snake segment count must be a non-negative integer.');
  }
  if (!Number.isFinite(segmentSpacing) || segmentSpacing <= 0) {
    throw new RangeError('Snake segment spacing must be a finite positive number.');
  }

  return { segmentCount, segmentSpacing };
}

export function growSnake(state: SnakeState, amount: number): SnakeState {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new RangeError('Snake growth amount must be a non-negative integer.');
  }

  return {
    ...state,
    segmentCount: state.segmentCount + amount
  };
}

export function sampleBodyPositions(state: SnakeState, trail: TrailBuffer): Vec3[] {
  const distances = Array.from(
    { length: state.segmentCount },
    (_, index) => (index + 1) * state.segmentSpacing
  );
  return trail.sampleManyFromNewest(distances);
}
