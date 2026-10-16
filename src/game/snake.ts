import { INITIAL_BODY_SEGMENTS, SEGMENT_SPACING } from './constants';
import { GRID_CONFIG, type GridConfig } from './grid-config';
import { cellKey } from './grid-topology';
import type { GridCell } from './grid-types';
import type { TrailBuffer } from './trail';
import type { Vec3 } from './types';

export type SnakeSegment = Readonly<{
  id: number;
  cell: GridCell;
}>;

export type GridSnakeState = {
  segments: SnakeSegment[];
  pendingGrowth: number;
  nextSegmentId: number;
};

const INITIAL_PATH_DIRECTIONS = [
  { x: 0, y: 0, z: -1 },
  { x: 0, y: -1, z: 0 },
  { x: -1, y: 0, z: 0 },
  { x: 1, y: 0, z: 0 },
  { x: 0, y: 1, z: 0 },
  { x: 0, y: 0, z: 1 }
] as const;

function cloneCell(cell: GridCell): GridCell {
  return { x: cell.x, y: cell.y, z: cell.z };
}

function cloneSegments(segments: readonly SnakeSegment[]): SnakeSegment[] {
  return segments.map((segment) => ({ id: segment.id, cell: cloneCell(segment.cell) }));
}

function createInitialGridCells(config: GridConfig): GridCell[] {
  const center = Math.floor(config.resolution / 2);
  const path: GridCell[] = [{ x: center, y: center, z: center }];
  const used = new Set<number>([cellKey(path[0], config)]);

  const extend = (): boolean => {
    if (path.length === config.initialLength) return true;
    const current = path[path.length - 1];

    for (const delta of INITIAL_PATH_DIRECTIONS) {
      const candidate: GridCell = {
        x: current.x + delta.x,
        y: current.y + delta.y,
        z: current.z + delta.z
      };

      if (
        candidate.x < 0 || candidate.x >= config.resolution
        || candidate.y < 0 || candidate.y >= config.resolution
        || candidate.z < 0 || candidate.z >= config.resolution
      ) {
        continue;
      }

      const key = cellKey(candidate, config);
      if (used.has(key)) continue;

      path.push(candidate);
      used.add(key);
      if (extend()) return true;
      path.pop();
      used.delete(key);
    }

    return false;
  };

  if (!extend()) {
    throw new RangeError(`Unable to create a non-wrapping initial snake of length ${config.initialLength}`);
  }

  return path;
}

export function createGridSnake(config: GridConfig = GRID_CONFIG): GridSnakeState {
  const cells = createInitialGridCells(config);
  return {
    segments: cells.map((cell, id) => ({ id, cell })),
    pendingGrowth: 0,
    nextSegmentId: cells.length
  };
}

export function snakeHead(state: GridSnakeState): SnakeSegment {
  const head = state.segments[0];
  if (!head) throw new RangeError('Grid snake has no head segment');
  return head;
}

export function snakeTail(state: GridSnakeState): SnakeSegment {
  const tail = state.segments[state.segments.length - 1];
  if (!tail) throw new RangeError('Grid snake has no tail segment');
  return tail;
}

export function occupiedCellKeys(
  state: GridSnakeState,
  config: GridConfig = GRID_CONFIG
): Set<number> {
  return new Set(state.segments.map((segment) => cellKey(segment.cell, config)));
}

export function addGrowth(state: GridSnakeState, amount: number): void {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new RangeError('Snake growth amount must be a non-negative integer');
  }
  state.pendingGrowth += amount;
}

export function commitSnakeStep(
  state: GridSnakeState,
  nextHead: GridCell
): Readonly<{
  previousSegments: readonly SnakeSegment[];
  currentSegments: readonly SnakeSegment[];
  grew: boolean;
  bornSegmentId: number | null;
}> {
  const previousSegments = cloneSegments(state.segments);
  const previousTail = previousSegments[previousSegments.length - 1];
  if (!previousTail) throw new RangeError('Grid snake has no tail segment');

  const moved = previousSegments.map((segment, index): SnakeSegment => ({
    id: segment.id,
    cell: index === 0 ? cloneCell(nextHead) : cloneCell(previousSegments[index - 1].cell)
  }));

  let bornSegmentId: number | null = null;
  const grew = state.pendingGrowth > 0;

  if (grew) {
    bornSegmentId = state.nextSegmentId;
    state.nextSegmentId += 1;
    moved.push({ id: bornSegmentId, cell: cloneCell(previousTail.cell) });
    state.pendingGrowth -= 1;
  }

  state.segments = moved;
  const currentSegments = cloneSegments(state.segments);

  return {
    previousSegments,
    currentSegments,
    grew,
    bornSegmentId
  };
}

// V1 compatibility surface. Removed when continuous RunState migrates in Task 5.
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
