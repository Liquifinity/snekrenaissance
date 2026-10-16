import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { GRID_CONFIG } from '../../src/game/grid-config';
import { INITIAL_GRID_FRAME, rotateGridFrame } from '../../src/game/grid-frame';
import type { GridCell, GridFrame, GridStep } from '../../src/game/grid-types';
import {
  buildRenderTransition,
  interpolateTransition
} from '../../src/render/interpolation';
import type { LogicalTransition } from '../../src/game/logical-transition';
import type { SnakeSegment } from '../../src/game/snake';

function segment(id: number, cell: GridCell): SnakeSegment {
  return { id, cell };
}

function logicalTransition(
  previous: readonly SnakeSegment[],
  current: readonly SnakeSegment[],
  previousFrame: GridFrame = INITIAL_GRID_FRAME,
  currentFrame: GridFrame = INITIAL_GRID_FRAME,
  headStep?: GridStep,
  bornSegmentId: number | null = null
): LogicalTransition {
  const from = previous[0].cell;
  const to = current[0].cell;
  return Object.freeze({
    previous: Object.freeze({ segments: Object.freeze(previous), frame: previousFrame }),
    current: Object.freeze({ segments: Object.freeze(current), frame: currentFrame }),
    headStep: headStep ?? Object.freeze({
      from,
      to,
      direction: currentFrame.forward,
      wrappedAxis: null,
      wrapSign: 0
    }),
    bornSegmentId
  });
}

function singleStep(from: GridCell, to: GridCell, frame = INITIAL_GRID_FRAME): LogicalTransition {
  return logicalTransition([segment(0, from)], [segment(0, to)], frame, frame);
}

function expectVec(actual: { x: number; y: number; z: number }, expected: { x: number; y: number; z: number }): void {
  expect(actual.x).toBeCloseTo(expected.x, 8);
  expect(actual.y).toBeCloseTo(expected.y, 8);
  expect(actual.z).toBeCloseTo(expected.z, 8);
}

describe('wrap-aware position interpolation', () => {
  it('interpolates an ordinary adjacent cell through local world space', () => {
    const transition = buildRenderTransition(singleStep(
      { x: 4, y: 4, z: 4 },
      { x: 5, y: 4, z: 4 }
    ));

    const result = interpolateTransition(transition, 0.5);
    expectVec(result.head.position, { x: 0.2, y: 0, z: 0 });
    expectVec(result.head.displayWrapOffset, { x: 0, y: 0, z: 0 });
    expect(result.head.duplicatePosition).toBeNull();
  });

  it.each([
    ['+X', { x: 8, y: 4, z: 4 }, { x: 0, y: 4, z: 4 }, { x: 1.8, y: 0, z: 0 }, { x: -3.6, y: 0, z: 0 }],
    ['-X', { x: 0, y: 4, z: 4 }, { x: 8, y: 4, z: 4 }, { x: -1.8, y: 0, z: 0 }, { x: 3.6, y: 0, z: 0 }],
    ['+Y', { x: 4, y: 8, z: 4 }, { x: 4, y: 0, z: 4 }, { x: 0, y: 1.8, z: 0 }, { x: 0, y: -3.6, z: 0 }],
    ['-Y', { x: 4, y: 0, z: 4 }, { x: 4, y: 8, z: 4 }, { x: 0, y: -1.8, z: 0 }, { x: 0, y: 3.6, z: 0 }],
    ['+Z', { x: 4, y: 4, z: 8 }, { x: 4, y: 4, z: 0 }, { x: 0, y: 0, z: 1.8 }, { x: 0, y: 0, z: -3.6 }],
    ['-Z', { x: 4, y: 4, z: 0 }, { x: 4, y: 4, z: 8 }, { x: 0, y: 0, z: -1.8 }, { x: 0, y: 0, z: 3.6 }]
  ] as const)('uses a one-cell virtual target for %s wrap instead of lerping through the cube', (_name, from, to, boundaryPoint, wrapOffset) => {
    const transition = buildRenderTransition(singleStep(from, to));

    const beforeBoundary = interpolateTransition(transition, 0.49).head;
    const atBoundary = interpolateTransition(transition, 0.5).head;
    const afterBoundary = interpolateTransition(transition, 0.51).head;

    expectVec(atBoundary.position, boundaryPoint);
    expectVec(beforeBoundary.displayWrapOffset, { x: 0, y: 0, z: 0 });
    expectVec(afterBoundary.displayWrapOffset, wrapOffset);

    const travel = Math.hypot(
      afterBoundary.position.x - beforeBoundary.position.x,
      afterBoundary.position.y - beforeBoundary.position.y,
      afterBoundary.position.z - beforeBoundary.position.z
    );
    expect(travel).toBeLessThan(GRID_CONFIG.cellSize * 0.1);
  });

  it('clamps presentation alpha to [0,1]', () => {
    const transition = buildRenderTransition(singleStep(
      { x: 4, y: 4, z: 4 },
      { x: 5, y: 4, z: 4 }
    ));
    expectVec(interpolateTransition(transition, -5).head.position, { x: 0, y: 0, z: 0 });
    expectVec(interpolateTransition(transition, 5).head.position, { x: 0.4, y: 0, z: 0 });
  });
});

describe('stable segment correspondence', () => {
  it('maps existing ids only to their own previous/current cells', () => {
    const logical = logicalTransition(
      [
        segment(10, { x: 4, y: 4, z: 4 }),
        segment(11, { x: 4, y: 4, z: 3 }),
        segment(12, { x: 4, y: 4, z: 2 })
      ],
      [
        segment(10, { x: 4, y: 4, z: 5 }),
        segment(11, { x: 4, y: 4, z: 4 }),
        segment(12, { x: 4, y: 4, z: 3 })
      ]
    );

    const render = buildRenderTransition(logical);
    expect(render.head).toEqual({ id: 10, from: { x: 4, y: 4, z: 4 }, to: { x: 4, y: 4, z: 5 }, born: false });
    expect(render.body).toEqual([
      { id: 11, from: { x: 4, y: 4, z: 3 }, to: { x: 4, y: 4, z: 4 }, born: false },
      { id: 12, from: { x: 4, y: 4, z: 2 }, to: { x: 4, y: 4, z: 3 }, born: false }
    ]);
  });

  it('births a new tail id at the previous tail cell and never from an unrelated index', () => {
    const logical = logicalTransition(
      [
        segment(0, { x: 4, y: 4, z: 4 }),
        segment(1, { x: 4, y: 4, z: 3 }),
        segment(2, { x: 4, y: 4, z: 2 })
      ],
      [
        segment(0, { x: 4, y: 4, z: 5 }),
        segment(1, { x: 4, y: 4, z: 4 }),
        segment(2, { x: 4, y: 4, z: 3 }),
        segment(3, { x: 4, y: 4, z: 2 })
      ],
      INITIAL_GRID_FRAME,
      INITIAL_GRID_FRAME,
      undefined,
      3
    );

    const render = buildRenderTransition(logical);
    expect(render.body.at(-1)).toEqual({
      id: 3,
      from: { x: 4, y: 4, z: 2 },
      to: { x: 4, y: 4, z: 2 },
      born: true
    });
  });

  it('keeps the built render mapping immutable after later logical mutation', () => {
    const previous = [segment(0, { x: 4, y: 4, z: 4 }), segment(1, { x: 4, y: 4, z: 3 })];
    const current = [segment(0, { x: 4, y: 4, z: 5 }), segment(1, { x: 4, y: 4, z: 4 })];
    const render = buildRenderTransition(logicalTransition(previous, current));

    (current as SnakeSegment[])[1] = segment(1, { x: 8, y: 8, z: 8 });
    expect(render.body[0].to).toEqual({ x: 4, y: 4, z: 4 });
    expect(Object.isFrozen(render)).toBe(true);
    expect(Object.isFrozen(render.body)).toBe(true);
  });
});

describe('presentation GridFrame interpolation', () => {
  it('maps the approved initial frame to identity visual orientation', () => {
    const transition = buildRenderTransition(singleStep(
      { x: 4, y: 4, z: 4 },
      { x: 4, y: 4, z: 5 }
    ));
    const frame = interpolateTransition(transition, 0).frame;
    expectVec(frame.forward, { x: 0, y: 0, z: 1 });
    expectVec(frame.up, { x: 0, y: 1, z: 0 });
    expectVec(frame.right, { x: -1, y: 0, z: 0 });
    expect(frame.quaternion.x).toBeCloseTo(0, 8);
    expect(frame.quaternion.y).toBeCloseTo(0, 8);
    expect(frame.quaternion.z).toBeCloseTo(0, 8);
    expect(frame.quaternion.w).toBeCloseTo(1, 8);
  });

  it('matches exact previous/current bases at alpha endpoints and stays finite/orthonormal between them', () => {
    const nextFrame = rotateGridFrame(INITIAL_GRID_FRAME, 'left');
    const logical = logicalTransition(
      [segment(0, { x: 4, y: 4, z: 4 })],
      [segment(0, { x: 5, y: 4, z: 4 })],
      INITIAL_GRID_FRAME,
      nextFrame
    );
    const transition = buildRenderTransition(logical);

    const start = interpolateTransition(transition, 0).frame;
    const mid = interpolateTransition(transition, 0.5).frame;
    const end = interpolateTransition(transition, 1).frame;

    expectVec(start.forward, { x: 0, y: 0, z: 1 });
    expectVec(end.forward, { x: 1, y: 0, z: 0 });

    for (const vector of [mid.forward, mid.right, mid.up]) {
      expect(Number.isFinite(vector.x)).toBe(true);
      expect(Number.isFinite(vector.y)).toBe(true);
      expect(Number.isFinite(vector.z)).toBe(true);
      expect(new Vector3(vector.x, vector.y, vector.z).length()).toBeCloseTo(1, 8);
    }

    const f = new Vector3(mid.forward.x, mid.forward.y, mid.forward.z);
    const r = new Vector3(mid.right.x, mid.right.y, mid.right.z);
    const u = new Vector3(mid.up.x, mid.up.y, mid.up.z);
    expect(Math.abs(f.dot(r))).toBeLessThan(1e-8);
    expect(Math.abs(f.dot(u))).toBeLessThan(1e-8);
    expect(Math.abs(r.dot(u))).toBeLessThan(1e-8);

    const q = new Quaternion(mid.quaternion.x, mid.quaternion.y, mid.quaternion.z, mid.quaternion.w);
    expect(q.length()).toBeCloseTo(1, 8);
  });
});
