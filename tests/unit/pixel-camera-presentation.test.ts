import { describe, expect, it } from 'vitest';
import { cellToWorld } from '../../src/game/grid-topology';
import { createRun } from '../../src/game/run-state';
import type { FlightPresentation } from '../../src/render/flight-presentation';
import {
  buildPixelChaseCameraSnapshot,
  unwrapCellCenterNear
} from '../../src/render/pixel-camera-presentation';

const stableRng = () => 0.75;

function navigation(overrides: Partial<FlightPresentation> = {}): FlightPresentation {
  return {
    unwrappedGridPoint: { x: 4.7, y: 4.2, z: 4.9 },
    headWorld: { x: 0.08, y: -0.12, z: 0.16 },
    displayedHeadWorld: { x: 0.08, y: -0.12, z: 0.16 },
    displayWrapOffset: { x: 0, y: 0, z: 0 },
    forwardWorld: { x: 0.4, y: 0.2, z: 0.89 },
    upWorld: { x: -0.08, y: 0.98, z: -0.18 },
    quaternion: { x: 0, y: 0, z: 0, w: 1 },
    ...overrides
  };
}

describe('V2.2 pixel chase-camera presentation', () => {
  it('unwraps a snapped cell center to the toroidal image nearest the navigation anchor', () => {
    expect(unwrapCellCenterNear({ x: 0, y: 4, z: 4 }, { x: 9.1, y: 4.5, z: 4.5 }, 9)).toEqual({
      x: 9.5,
      y: 4.5,
      z: 4.5
    });
  });

  it('uses the exact strategic head center while preserving continuous forward/up guidance', () => {
    const run = createRun(stableRng);
    const nav = navigation();
    const snapshot = buildPixelChaseCameraSnapshot(run, nav);
    const displayed = {
      x: snapshot.headWorld.x + snapshot.displayWrapOffset.x,
      y: snapshot.headWorld.y + snapshot.displayWrapOffset.y,
      z: snapshot.headWorld.z + snapshot.displayWrapOffset.z
    };

    expect(displayed).toEqual(cellToWorld(run.snake.segments[0].cell, run.config));
    expect(snapshot.forwardWorld).toEqual(nav.forwardWorld);
    expect(snapshot.upWorld).toEqual(nav.upWorld);
  });

  it('keeps the snapped displayed head fixed while continuous navigation moves inside the same cell', () => {
    const run = createRun(stableRng);
    const first = buildPixelChaseCameraSnapshot(run, navigation({
      unwrappedGridPoint: { x: 4.55, y: 4.51, z: 4.63 }
    }));
    const second = buildPixelChaseCameraSnapshot(run, navigation({
      unwrappedGridPoint: { x: 4.93, y: 4.12, z: 4.99 },
      forwardWorld: { x: 0.9, y: 0.1, z: 0.42 }
    }));

    const display = (snapshot: typeof first) => ({
      x: snapshot.headWorld.x + snapshot.displayWrapOffset.x,
      y: snapshot.headWorld.y + snapshot.displayWrapOffset.y,
      z: snapshot.headWorld.z + snapshot.displayWrapOffset.z
    });

    expect(display(first)).toEqual(display(second));
    expect(first.forwardWorld).not.toEqual(second.forwardWorld);
  });

  it('represents 8→0 wrap as a display offset instead of a cross-cube target', () => {
    const run = createRun(stableRng);
    run.snake.segments[0] = { id: run.snake.segments[0].id, cell: { x: 0, y: 4, z: 4 } };
    const snapshot = buildPixelChaseCameraSnapshot(run, navigation({
      unwrappedGridPoint: { x: 9.1, y: 4.5, z: 4.5 }
    }));
    const canonical = cellToWorld({ x: 0, y: 4, z: 4 }, run.config);

    expect(snapshot.headWorld.x).toBeGreaterThan(run.config.worldSize / 2);
    expect(snapshot.displayWrapOffset.x).toBeCloseTo(-run.config.worldSize, 12);
    expect(snapshot.headWorld.x + snapshot.displayWrapOffset.x).toBeCloseTo(canonical.x, 12);
  });
});
