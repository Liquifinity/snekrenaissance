import './styles.css';
import { AppController } from './app/app-controller';
import { createSessionGateway } from './app/gateway-selection';
import { RuntimeLifecycle } from './app/runtime-lifecycle';
import { GRID_CONFIG } from './game/grid-config';
import { cellToWorld } from './game/grid-topology';
import type { GridDirection } from './game/grid-types';
import {
  queueDirection,
  stepRun,
  type RunResult,
  type RunState
} from './game/run-state';
import { FixedStepClock } from './game/simulation';
import { createDirectionPad } from './input/direction-pad';
import { KeyboardInput } from './input/keyboard';
import { BoardCameraController } from './render/board-camera';
import { FoodRenderer } from './render/food-renderer';
import { buildPixelSnakeRenderSnapshot } from './render/pixel-snake-presentation';
import { createScene } from './render/scene';
import { SnakeRenderer } from './render/snake-renderer';

const appCandidate = document.querySelector<HTMLElement>('#app');
const canvasCandidate = document.querySelector<HTMLCanvasElement>('#game-canvas');
if (!appCandidate || !canvasCandidate) {
  throw new Error('Missing application shell.');
}
const app = appCandidate;
const canvas = canvasCandidate;

const scene = createScene(canvas);
const snakeRenderer = new SnakeRenderer(scene.scene);
const foodRenderer = new FoodRenderer(scene.scene);
const boardCamera = new BoardCameraController(scene.camera);
const sessionGateway = createSessionGateway(import.meta.env.VITE_RANKING_API_BASE);
const controller = new AppController({ root: app, gateway: sessionGateway });
const fixedClock = new FixedStepClock(1 / GRID_CONFIG.stepsPerSecond);

type TouchPoint = Readonly<{ x: number; y: number }>;
const CAMERA_WHEEL_SENSITIVITY = 0.001;
const cameraTouchPoints = new Map<number, TouchPoint>();
let pinchStartDistance: number | null = null;
let pinchStartZoomFactor = boardCamera.zoomFactor;
app.dataset.cameraMode = 'board';
app.dataset.cameraZoomFactor = boardCamera.zoomFactor.toFixed(4);

function submitDirection(direction: GridDirection): void {
  const run = controller.currentRun;
  if (run && run.phase === 'playing') queueDirection(run, direction);
}

function setCameraZoomFactor(factor: number): void {
  boardCamera.setZoomFactor(factor);
  app.dataset.cameraZoomFactor = boardCamera.zoomFactor.toFixed(4);
  boardCamera.apply(scene.camera.aspect);
}

function touchDistance(): number | null {
  if (cameraTouchPoints.size !== 2) return null;
  const [first, second] = [...cameraTouchPoints.values()];
  if (!first || !second) return null;
  const distance = Math.hypot(second.x - first.x, second.y - first.y);
  return Number.isFinite(distance) && distance > 0 ? distance : null;
}

function restartPinchBaseline(): void {
  pinchStartDistance = touchDistance();
  pinchStartZoomFactor = boardCamera.zoomFactor;
}

function handleCameraWheel(event: WheelEvent): void {
  if (controller.screen !== 'game') return;
  event.preventDefault();
  const multiplier = Math.exp(event.deltaY * CAMERA_WHEEL_SENSITIVITY);
  setCameraZoomFactor(boardCamera.zoomFactor * multiplier);
}

function handleCameraPointerDown(event: PointerEvent): void {
  if (controller.screen !== 'game' || event.pointerType !== 'touch') return;
  cameraTouchPoints.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (cameraTouchPoints.size === 2) restartPinchBaseline();
  else if (cameraTouchPoints.size > 2) pinchStartDistance = null;
  if (cameraTouchPoints.size >= 2) event.preventDefault();
}

function handleCameraPointerMove(event: PointerEvent): void {
  if (!cameraTouchPoints.has(event.pointerId)) return;
  cameraTouchPoints.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (cameraTouchPoints.size !== 2 || pinchStartDistance === null) return;

  const distance = touchDistance();
  if (distance === null) return;
  setCameraZoomFactor(pinchStartZoomFactor * (distance / pinchStartDistance));
  event.preventDefault();
}

function handleCameraPointerEnd(event: PointerEvent): void {
  if (!cameraTouchPoints.delete(event.pointerId)) return;
  if (cameraTouchPoints.size === 2) restartPinchBaseline();
  else pinchStartDistance = null;
}

const keyboard = new KeyboardInput({ onDirection: submitDirection });
const directionPad = createDirectionPad(submitDirection);
app.append(directionPad);

const runtimeError = document.createElement('div');
runtimeError.className = 'runtime-error';
runtimeError.dataset.runtimeError = '';
runtimeError.hidden = true;
app.append(runtimeError);

const detachKeyboard = keyboard.attach(window);
controller.mount();

function resize(): void {
  const rect = canvas.getBoundingClientRect();
  scene.resize(rect.width, rect.height);
  boardCamera.apply(scene.camera.aspect);
}

function showRuntimeError(message: string): void {
  runtimeError.textContent = message;
  runtimeError.hidden = false;
  app.dataset.runtimeError = 'true';
}

const lifecycle = new RuntimeLifecycle(fixedClock, {
  resize,
  resetTouch: () => {
    cameraTouchPoints.clear();
    pinchStartDistance = null;
  },
  showError: showRuntimeError
});

function exposeFoodPickupTelemetry(
  run: RunState,
  food: Readonly<{ x: number; y: number; z: number }>
): void {
  const head = run.snake.segments[0];
  if (!head) return;
  const foodWorld = cellToWorld(food, run.config);
  const headWorld = cellToWorld(head.cell, run.config);
  app.dataset.lastFoodPickupCell = `${food.x},${food.y},${food.z}`;
  app.dataset.lastFoodPickupWorld = `${foodWorld.x},${foodWorld.y},${foodWorld.z}`;
  app.dataset.lastFoodPickupHeadWorld = `${headWorld.x},${headWorld.y},${headWorld.z}`;
}

// Read-only browser diagnostics used by responsive/E2E verification. Never read back by gameplay.
function exposeLogicalTelemetry(run: RunState): void {
  const head = run.snake.segments[0];
  if (!head) return;
  app.dataset.headCell = `${head.cell.x},${head.cell.y},${head.cell.z}`;
  app.dataset.headDirection = run.heading;
  app.dataset.pendingDirection = run.pendingDirection ?? 'none';
  delete app.dataset.headUp;
  delete app.dataset.pendingTurn;
  delete app.dataset.joystickSector;
  const headWorld = cellToWorld(head.cell, run.config);
  app.dataset.headRenderWorld = `${headWorld.x},${headWorld.y},${headWorld.z}`;
}

function initializeRun(run: RunState): void {
  fixedClock.reset();
  boardCamera.apply(scene.camera.aspect);
  exposeLogicalTelemetry(run);
}

function advanceStrategicRun(run: RunState): void {
  const previousLength = run.snake.segments.length;
  const previousFoods = run.foodsCollected;
  const consumedFood = run.food ? { ...run.food } : null;
  stepRun(run);

  if (consumedFood && run.foodsCollected > previousFoods) {
    exposeFoodPickupTelemetry(run, consumedFood);
  }

  if (
    run.phase === 'game-over'
    || run.phase === 'completed'
    || run.snake.segments.length !== previousLength
    || run.foodsCollected !== previousFoods
  ) {
    controller.handleRunState(run);
  }
}

function consumeStrategicFrame(run: RunState, frameDeltaSeconds: number): number {
  return lifecycle.consumeFrame(frameDeltaSeconds, () => advanceStrategicRun(run));
}

type TestFoodCell = Readonly<{ x: number; y: number; z: number }>;
const e2eMode = import.meta.env.MODE === 'e2e' || import.meta.env.MODE === 'e2e-ranked';
let manualClock = e2eMode;
let activeRun: RunState | null = null;
let lastTimestamp: number | null = null;
let frameId = 0;
let rendererFailed = false;

if (e2eMode) {
  const testWindow = window as typeof window & {
    __SNEK_TEST__?: {
      apiBase: string;
      gatewayKind: string;
      setManualClock: (enabled: boolean) => void;
      consumeFrame: (frameDeltaSeconds: number) => number;
      setFoodCell: (cell: TestFoodCell) => void;
      getCameraPosition: () => Readonly<{ x: number; y: number; z: number }>;
      forceGameOver: (result: RunResult) => void;
    };
  };

  testWindow.__SNEK_TEST__ = {
    apiBase: import.meta.env.VITE_RANKING_API_BASE ?? '',
    gatewayKind: sessionGateway.constructor.name,
    setManualClock: (enabled) => {
      manualClock = enabled;
      fixedClock.reset();
    },
    consumeFrame: (frameDeltaSeconds) => {
      const run = controller.currentRun;
      if (!run || run.phase !== 'playing') {
        throw new Error('No active playing run for deterministic frame consumption.');
      }
      const steps = consumeStrategicFrame(run, frameDeltaSeconds);
      exposeLogicalTelemetry(run);
      return steps;
    },
    setFoodCell: (cell) => {
      const run = controller.currentRun;
      if (!run) throw new Error('No active run for deterministic food placement.');

      for (const axis of ['x', 'y', 'z'] as const) {
        const value = cell[axis];
        if (!Number.isInteger(value) || value < 0 || value >= run.config.resolution) {
          throw new RangeError(`Test food ${axis} must be an integer in 0..${run.config.resolution - 1}.`);
        }
      }

      const occupied = run.snake.segments.some((segment) => (
        segment.cell.x === cell.x
        && segment.cell.y === cell.y
        && segment.cell.z === cell.z
      ));
      if (occupied) throw new Error('Cannot place deterministic test food on an occupied snake cell.');

      run.food = { x: cell.x, y: cell.y, z: cell.z };
    },
    getCameraPosition: () => ({
      x: scene.camera.position.x,
      y: scene.camera.position.y,
      z: scene.camera.position.z
    }),
    forceGameOver: (result) => {
      const run = controller.currentRun;
      if (!run) throw new Error('No active run to finish.');
      run.phase = 'game-over';
      run.result = result;
      run.maxLength = result.maxLength;
      controller.handleRunState(run);
    }
  };
}

function frame(timestamp: number): void {
  const run = controller.currentRun;
  if (run !== activeRun) {
    activeRun = run;
    lastTimestamp = timestamp;
    if (run) initializeRun(run);
  }

  const frameDeltaSeconds = lastTimestamp === null
    ? 0
    : Math.max(0, (timestamp - lastTimestamp) / 1000);
  lastTimestamp = timestamp;

  if (run?.phase === 'playing' && !manualClock) {
    consumeStrategicFrame(run, frameDeltaSeconds);
  }

  if (run) {
    exposeLogicalTelemetry(run);
    snakeRenderer.render(buildPixelSnakeRenderSnapshot(run));
    foodRenderer.render(run.food ? cellToWorld(run.food, run.config) : null);
  }

  if (!rendererFailed) {
    try {
      scene.render();
    } catch (error) {
      rendererFailed = true;
      lifecycle.handleRendererError(error);
    }
  }

  frameId = requestAnimationFrame(frame);
}

function handleVisibilityChange(): void {
  lifecycle.setHidden(document.hidden);
  lastTimestamp = null;
}

function handleResize(): void {
  lifecycle.handleResize();
}

function handleOrientationChange(): void {
  lifecycle.handleOrientationChange();
}

canvas.addEventListener('wheel', handleCameraWheel, { passive: false });
canvas.addEventListener('pointerdown', handleCameraPointerDown);
canvas.addEventListener('pointermove', handleCameraPointerMove);
canvas.addEventListener('pointerup', handleCameraPointerEnd);
canvas.addEventListener('pointercancel', handleCameraPointerEnd);
canvas.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  rendererFailed = true;
  lifecycle.handleRendererError(new Error('WebGL context lost'));
});

document.addEventListener('visibilitychange', handleVisibilityChange);
window.addEventListener('resize', handleResize);
window.addEventListener('orientationchange', handleOrientationChange);

resize();
frameId = requestAnimationFrame(frame);

window.addEventListener('pagehide', () => {
  cancelAnimationFrame(frameId);
  detachKeyboard();
  directionPad.remove();
  canvas.removeEventListener('wheel', handleCameraWheel);
  canvas.removeEventListener('pointerdown', handleCameraPointerDown);
  canvas.removeEventListener('pointermove', handleCameraPointerMove);
  canvas.removeEventListener('pointerup', handleCameraPointerEnd);
  canvas.removeEventListener('pointercancel', handleCameraPointerEnd);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('orientationchange', handleOrientationChange);
  snakeRenderer.dispose();
  foodRenderer.dispose();
  scene.dispose();
}, { once: true });
