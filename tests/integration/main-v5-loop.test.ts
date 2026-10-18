import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BoardCameraController } from '../../src/render/board-camera';
import {
  INITIAL_VIEW_FRAME,
  mapViewCommand,
  type ViewFrame
} from '../../src/render/view-frame';
import { createRun, queueDirection, startRun, stepRun } from '../../src/game/run-state';
import { snakeHead } from '../../src/game/snake';

const source = readFileSync(new URL('../../src/main.ts', import.meta.url), 'utf8');
const stableRng = () => 0.75;

function strategicSnapshot(run: ReturnType<typeof startRun>) {
  return JSON.stringify({
    heading: run.heading,
    pendingDirection: run.pendingDirection,
    snake: run.snake.segments.map((segment) => segment.cell),
    food: run.food,
    score: run.score,
    foodsCollected: run.foodsCollected,
    phase: run.phase
  });
}

describe('browser main loop V5 orbit/view authority', () => {
  it('wires semantic input through the current ViewFrame before queueDirection', () => {
    expect(source).toContain('INITIAL_VIEW_FRAME');
    expect(source).toContain('selectViewFrame');
    expect(source).toContain('mapViewCommand');
    expect(source).toContain('onCommand:');
    expect(source).toMatch(/mapViewCommand\(currentViewFrame, command\)/);
    expect(source).toMatch(/queueDirection\(run, direction\)/);
    expect(source).not.toContain('onDirection: submitDirection');
  });

  it('resolves a buffered command at event time and never reinterprets it after the view changes', () => {
    const run = startRun(createRun(stableRng));
    run.food = { x: 0, y: 0, z: 0 };
    let frame: ViewFrame = INITIAL_VIEW_FRAME;

    const absoluteAtEvent = mapViewCommand(frame, 'right');
    queueDirection(run, absoluteAtEvent);
    frame = { up: '+Y', right: '-Z', intoScreen: '-X' };
    expect(mapViewCommand(frame, 'right')).toBe('-Z');

    stepRun(run, stableRng);
    expect(run.heading).toBe('+X');
    expect(snakeHead(run.snake).cell).toEqual({ x: 5, y: 4, z: 4 });
  });

  it('keeps camera orbit outside deterministic gameplay state', () => {
    const run = startRun(createRun(stableRng));
    run.food = { x: 1, y: 2, z: 3 };
    queueDirection(run, '+X');
    const before = strategicSnapshot(run);

    const camera = new BoardCameraController();
    camera.apply(16 / 9);
    camera.orbitBy(1.2, -0.4);
    camera.apply(9 / 16);
    camera.setZoomFactor(2);
    camera.apply(1);

    expect(strategicSnapshot(run)).toBe(before);
  });

  it('uses one manual orbit-board camera with no chase or automatic wrap authority', () => {
    expect(source).toContain('attachBoardOrbit');
    expect(source).toContain("app.dataset.cameraMode = 'orbit-board'");
    expect(source).toContain('app.dataset.viewUp');
    expect(source).toContain('app.dataset.viewRight');
    expect(source).toContain('app.dataset.viewInto');
    expect(source).not.toContain('ChaseCameraController');
    expect(source).not.toContain('wrapRebase');
    expect(source).not.toContain('updateChaseCamera');
  });

  it('never stores ViewFrame in RunState', () => {
    const run = startRun(createRun(stableRng)) as unknown as Record<string, unknown>;
    expect(run).not.toHaveProperty('viewFrame');
    expect(run).not.toHaveProperty('camera');
    expect(run).not.toHaveProperty('cameraBasis');
  });
});
