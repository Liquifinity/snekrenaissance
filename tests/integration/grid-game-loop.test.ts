import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { cellToWorld } from '../../src/game/grid-topology';
import { FixedStepClock } from '../../src/game/simulation';
import {
  createRun,
  queueTurnIntent,
  startRun,
  stepRun
} from '../../src/game/run-state';
import { snakeHead } from '../../src/game/snake';
import { JoystickInput } from '../../src/input/joystick';
import { KeyboardInput } from '../../src/input/keyboard';
import { ChaseCameraController } from '../../src/render/chase-camera';
import { FoodRenderer } from '../../src/render/food-renderer';
import {
  buildRenderTransition,
  buildStationaryRenderTransition,
  interpolateTransition
} from '../../src/render/interpolation';
import { SnakeRenderer } from '../../src/render/snake-renderer';

const stableRng = () => 0.75;

function execute(chunks: number[]) {
  const run = startRun(createRun(stableRng));
  run.food = { x: 0, y: 0, z: 0 };
  queueTurnIntent(run, 'left');
  queueTurnIntent(run, 'up');
  for (const dt of chunks) stepRun(run, dt, stableRng);

  return {
    head: snakeHead(run.snake).cell,
    frame: run.frame,
    segments: run.snake.segments.map((segment) => ({ id: segment.id, cell: segment.cell })),
    pendingGrowth: run.snake.pendingGrowth,
    score: run.score,
    phase: run.phase,
    alpha: run.renderAlpha
  };
}

function consumeFixedTicks(
  clock: FixedStepClock,
  count: number,
  step: (dt: number) => void
): void {
  for (let index = 0; index < count; index += 1) {
    clock.consume(1 / 60, step);
  }
}

describe('V2 grid game loop determinism', () => {
  it('produces the same logical state for equivalent elapsed time chunking', () => {
    const sixtyHz = execute(Array.from({ length: 24 }, () => 1 / 60));
    const thirtyHz = execute(Array.from({ length: 12 }, () => 1 / 30));
    const irregular = execute([0.11, 0.09, 0.07, 0.13]);

    expect(thirtyHz).toEqual(sixtyHz);
    expect(irregular.head).toEqual(sixtyHz.head);
    expect(irregular.frame).toEqual(sixtyHz.frame);
    expect(irregular.segments).toEqual(sixtyHz.segments);
    expect(irregular.pendingGrowth).toBe(sixtyHz.pendingGrowth);
    expect(irregular.score).toBe(sixtyHz.score);
    expect(irregular.phase).toBe(sixtyHz.phase);
    expect(irregular.alpha).toBeCloseTo(sixtyHz.alpha, 8);
  });

  it('preserves queued turn order through bounded outer-clock stalls', () => {
    const run = startRun(createRun(stableRng));
    run.food = { x: 0, y: 0, z: 0 };
    queueTurnIntent(run, 'left');
    queueTurnIntent(run, 'up');
    const fixed = new FixedStepClock();

    fixed.consume(1, (dt) => stepRun(run, dt, stableRng));
    expect(snakeHead(run.snake).cell).toEqual({ x: 4, y: 4, z: 4 });
    expect(run.turnQueue.size).toBe(2);

    fixed.consume(1, (dt) => stepRun(run, dt, stableRng));
    expect(snakeHead(run.snake).cell).toEqual({ x: 5, y: 4, z: 4 });
    expect(run.frame.forward).toBe('+X');
    expect(run.turnQueue.size).toBe(1);
    expect(run.transition?.current.segments[0].cell).toEqual({ x: 5, y: 4, z: 4 });
  });

  it('queues simultaneous adapter intents keyboard-first, then joystick, one per cell commit', () => {
    const run = startRun(createRun(stableRng));
    run.food = { x: 0, y: 0, z: 0 };
    const keyboard = new KeyboardInput();
    const joystick = new JoystickInput();
    const fixed = new FixedStepClock();

    keyboard.handleKeyDown('ArrowLeft');
    joystick.begin(1, 0, 0, 0, 0, 100);
    joystick.move(1, 0, -70);

    const keyboardIntent = keyboard.takeIntent();
    const joystickIntent = joystick.takeIntent();
    expect(keyboardIntent).toBe('left');
    expect(joystickIntent).toBe('up');
    queueTurnIntent(run, keyboardIntent);
    queueTurnIntent(run, joystickIntent);
    expect(run.turnQueue.size).toBe(2);

    consumeFixedTicks(fixed, 10, (dt) => stepRun(run, dt, stableRng));
    expect(snakeHead(run.snake).cell).toEqual({ x: 5, y: 4, z: 4 });
    expect(run.frame.forward).toBe('+X');
    expect(run.turnQueue.size).toBe(1);

    consumeFixedTicks(fixed, 10, (dt) => stepRun(run, dt, stableRng));
    expect(snakeHead(run.snake).cell).toEqual({ x: 5, y: 5, z: 4 });
    expect(run.frame.forward).toBe('+Y');
    expect(run.turnQueue.size).toBe(0);
  });

  it('builds a stationary presentation before the first committed logical transition', () => {
    const run = startRun(createRun(stableRng));
    expect(run.transition).toBeNull();

    const renderTransition = buildStationaryRenderTransition(run.snake.segments, run.frame);
    const presentation = interpolateTransition(renderTransition, 0.75, run.config);

    expect(presentation.head.position).toEqual(cellToWorld(snakeHead(run.snake).cell, run.config));
    expect(presentation.body).toHaveLength(run.snake.segments.length - 1);
    expect(presentation.head.displayWrapOffset).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('flows committed logical state through interpolation, voxel renderers, and chase camera without world-to-cell feedback', () => {
    const run = startRun(createRun(stableRng));
    run.food = { x: 0, y: 0, z: 0 };
    queueTurnIntent(run, 'left');
    const fixed = new FixedStepClock();
    consumeFixedTicks(fixed, 10, (dt) => stepRun(run, dt, stableRng));

    expect(run.transition).not.toBeNull();
    if (!run.transition) return;

    const renderTransition = buildRenderTransition(run.transition, run.config);
    const presentation = interpolateTransition(renderTransition, run.renderAlpha, run.config);

    const scene = new THREE.Scene();
    const snakeRenderer = new SnakeRenderer(scene);
    const foodRenderer = new FoodRenderer(scene);
    snakeRenderer.render(presentation);
    foodRenderer.render(run.food ? cellToWorld(run.food, run.config) : null);

    expect(snakeRenderer.renderedSegmentCount).toBe(run.snake.segments.length - 1);
    expect(scene.getObjectByName('snake-head')).toBeDefined();
    expect(scene.getObjectByName('food-voxel')).toBeDefined();

    const camera = new ChaseCameraController();
    const pose = camera.update({
      headWorld: presentation.head.position,
      forwardWorld: presentation.frame.forward,
      upWorld: presentation.frame.up,
      displayWrapOffset: presentation.head.displayWrapOffset
    }, 0);

    expect([pose.position.x, pose.position.y, pose.position.z]).toSatisfy(
      (values: number[]) => values.every(Number.isFinite)
    );

    snakeRenderer.dispose();
    foodRenderer.dispose();
  });
});
