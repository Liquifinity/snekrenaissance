import { describe, expect, it } from 'vitest';
import { cellToWorld, directionVector } from '../../src/game/grid-topology';
import type { GridFrame } from '../../src/game/grid-types';
import { createRun } from '../../src/game/run-state';
import { buildPixelChaseCameraSnapshot } from '../../src/render/pixel-camera-presentation';

const stableRng = () => 0.75;

function vector(direction: GridFrame['forward']) {
  const value = directionVector(direction);
  return { x: value.x, y: value.y, z: value.z };
}

describe('SNEK CORE V3 pixel chase-camera presentation', () => {
  it('derives the complete snapshot from snapped GridCell + GridFrame only', () => {
    const run = createRun(stableRng);
    const snapshot = buildPixelChaseCameraSnapshot(run);

    expect(snapshot).toEqual({
      headWorld: cellToWorld(run.snake.segments[0].cell, run.config),
      forwardWorld: vector(run.frame.forward),
      upWorld: vector(run.frame.up)
    });
    expect(snapshot).not.toHaveProperty('displayWrapOffset');
  });

  it.each([
    [{ forward: '+Y', right: '+X', up: '+Z' }, '+Y', '+Z'],
    [{ forward: '+Y', right: '-X', up: '-Z' }, '+Y', '-Z'],
    [{ forward: '-Y', right: '-X', up: '+Z' }, '-Y', '+Z'],
    [{ forward: '-Z', right: '+X', up: '+Y' }, '-Z', '+Y']
  ] as const)('preserves full cardinal frame %#', (frame, forward, up) => {
    const run = createRun(stableRng);
    run.frame = frame;

    const snapshot = buildPixelChaseCameraSnapshot(run);
    expect(snapshot.forwardWorld).toEqual(vector(forward));
    expect(snapshot.upWorld).toEqual(vector(up));
  });

  it('uses the canonical snapped head center even at a toroidal boundary', () => {
    const run = createRun(stableRng);
    run.snake.segments[0] = {
      id: run.snake.segments[0].id,
      cell: { x: 0, y: 4, z: 4 }
    };

    expect(buildPixelChaseCameraSnapshot(run).headWorld).toEqual(
      cellToWorld({ x: 0, y: 4, z: 4 }, run.config)
    );
  });
});
