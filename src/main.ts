import './styles.css';
import { AppController } from './app/app-controller';
import { createSessionGateway } from './app/gateway-selection';
import { RuntimeLifecycle } from './app/runtime-lifecycle';
import { GRID_CONFIG } from './game/grid-config';
import { cellToWorld } from './game/grid-topology';
import {
  queueTurn,
  stepRun,
  type RunResult,
  type RunState
} from './game/run-state';
import { FixedStepClock } from './game/simulation';
import { JoystickInput } from './input/joystick';
import { KeyboardInput } from './input/keyboard';
import { ChaseCameraController } from './render/chase-camera';
import { FoodRenderer } from './render/food-renderer';
import {
  interpolateFlightPresentation,
  type FlightPresentation
} from './render/flight-presentation';
import { applyOverviewCamera } from './render/overview-camera';
import { buildPixelChaseCameraSnapshot } from './render/pixel-camera-presentation';
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
const cameraController = new ChaseCameraController(scene.camera);
const sessionGateway = createSessionGateway(import.meta.env.VITE_RANKING_API_BASE);
const controller = new AppController({ root: app, gateway: sessionGateway });
const fixedClock = new FixedStepClock(1 / GRID_CONFIG.stepsPerSecond);
const joystick = new JoystickInput({
  onTurnIntent: (intent) => {
    const run = controller.currentRun;
    if (run && run.phase === 'playing') queueTurn(run, intent);
  }
});

type CameraMode = 'chase' | 'overview';
let cameraMode: CameraMode = 'chase';
app.dataset.cameraMode = cameraMode;

function buildPresentation(run: RunState): FlightPresentation {
  return interpolateFlightPresentation(
    run.previousFlight,
    run.flight,
    fixedClock.alpha,
    run.config
  );
}

function updateChaseCamera(
  run: RunState,
  presentation: FlightPresentation,
  dtSeconds: number
): void {
  const snapshot = buildPixelChaseCameraSnapshot(run, presentation);
  cameraController.update(snapshot, dtSeconds);
}

function setCameraMode(mode: CameraMode): void {
  cameraMode = mode;
  app.dataset.cameraMode = mode;
  const run = controller.currentRun;

  if (mode === 'overview') {
    applyOverviewCamera(scene.camera, run?.config);
    return;
  }

  cameraController.reset();
  if (run) updateChaseCamera(run, buildPresentation(run), 0);
}

function toggleCamera(): void {
  if (controller.screen !== 'game') return;
  setCameraMode(cameraMode === 'chase' ? 'overview' : 'chase');
}

const keyboard = new KeyboardInput({
  onTurnIntent: (intent) => {
    const run = controller.currentRun;
    if (run && run.phase === 'playing') queueTurn(run, intent);
  },
  onCameraToggle: toggleCamera
});

const joystickShell = document.createElement('div');
joystickShell.className = 'joystick-shell';
joystickShell.dataset.joystick = '';
joystickShell.setAttribute('aria-label', 'Steering joystick');
const joystickKnob = document.createElement('div');
joystickKnob.className = 'joystick-knob';
joystickShell.append(joystickKnob);
app.append(joystickShell);

const cameraToggle = document.createElement('button');
cameraToggle.type = 'button';
cameraToggle.className = 'camera-toggle';
cameraToggle.dataset.cameraToggle = '';
cameraToggle.textContent = 'X CAMERA';
cameraToggle.setAttribute('aria-label', 'Change camera');
cameraToggle.addEventListener('click', toggleCamera);
app.append(cameraToggle);

const runtimeError = document.createElement('div');
runtimeError.className = 'runtime-error';
runtimeError.dataset.runtimeError = '';
runtimeError.hidden = true;
app.append(runtimeError);

const detachKeyboard = keyboard.attach(window);
const detachJoystick = joystick.attach(joystickShell, window);
controller.mount();

if (import.meta.env.MODE === 'e2e-ranked') {
  type TestFoodCell = Readonly<{ x: number; y: number; z: number }>;
  const testWindow = window as typeof window & {
    __SNEK_TEST__?: {
      apiBase: string;
      gatewayKind: string;
      setFoodCell: (cell: TestFoodCell) => void;
      forceGameOver: (result: RunResult) => void;
    };
  };
  testWindow.__SNEK_TEST__ = {
    apiBase: import.meta.env.VITE_RANKING_API_BASE ?? '',
    gatewayKind: sessionGateway.constructor.name,
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

function resize(): void {
  const rect = canvas.getBoundingClientRect();
  scene.resize(rect.width, rect.height);
}

function showRuntimeError(message: string): void {
  runtimeError.textContent = message;
  runtimeError.hidden = false;
  app.dataset.runtimeError = 'true';
}

const lifecycle = new RuntimeLifecycle(fixedClock, {
  resize,
  resetTouch: () => joystick.reset(),
  showError: showRuntimeError
});

function updateJoystickVisual(): void {
  const vector = joystick.visualVector;
  joystickKnob.style.transform = `translate(${vector.x * 28}px, ${-vector.y * 28}px)`;
}

function exposeFoodPickupTelemetry(run: RunState, food: Readonly<{ x: number; y: number; z: number }>): void {
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
  app.dataset.headYaw = String(run.flight.orientation.yaw);
  app.dataset.headPitch = String(run.flight.orientation.pitch);
  const point = run.flight.wrappedPosition;
  app.dataset.headPoint = `${point.x},${point.y},${point.z}`;
  app.dataset.headDirection = run.visibleDirection;
  const headWorld = cellToWorld(head.cell, run.config);
  app.dataset.headRenderWorld = `${headWorld.x},${headWorld.y},${headWorld.z}`;
}

function initializeRun(run: RunState): void {
  fixedClock.reset();
  cameraController.reset();
  setCameraMode('chase');
  updateChaseCamera(run, buildPresentation(run), 0);
  exposeLogicalTelemetry(run);
}

let activeRun: RunState | null = null;
let lastTimestamp: number | null = null;
let frameId = 0;
let rendererFailed = false;

function frame(timestamp: number): void {
  updateJoystickVisual();

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

  if (run?.phase === 'playing') {
    lifecycle.consumeFrame(frameDeltaSeconds, () => {
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
    });
  }

  if (run) {
    exposeLogicalTelemetry(run);
    const presentation = buildPresentation(run);
    snakeRenderer.render(buildPixelSnakeRenderSnapshot(run));
    foodRenderer.render(run.food ? cellToWorld(run.food, run.config) : null);

    if (cameraMode === 'chase') {
      updateChaseCamera(run, presentation, frameDeltaSeconds);
    }
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
  if (cameraMode === 'overview') {
    applyOverviewCamera(scene.camera, controller.currentRun?.config);
  }
}

function handleOrientationChange(): void {
  lifecycle.handleOrientationChange();
  if (cameraMode === 'overview') {
    applyOverviewCamera(scene.camera, controller.currentRun?.config);
  }
}

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
  detachJoystick();
  cameraToggle.removeEventListener('click', toggleCamera);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('orientationchange', handleOrientationChange);
  snakeRenderer.dispose();
  foodRenderer.dispose();
  scene.dispose();
}, { once: true });
