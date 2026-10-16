import './styles.css';
import { AppController } from './app/app-controller';
import { createSessionGateway } from './app/gateway-selection';
import { RuntimeLifecycle } from './app/runtime-lifecycle';
import { stepRun, type RunResult, type RunState } from './game/run-state';
import { FixedStepClock } from './game/simulation';
import { clampInputAxis, type InputState } from './input/input-state';
import { JoystickInput } from './input/joystick';
import { KeyboardInput } from './input/keyboard';
import { ChaseCameraController } from './render/chase-camera';
import { FoodRenderer } from './render/food-renderer';
import { applyOverviewCamera } from './render/overview-camera';
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
const fixedClock = new FixedStepClock();
const joystick = new JoystickInput();

type CameraMode = 'chase' | 'overview';
let cameraMode: CameraMode = 'chase';
app.dataset.cameraMode = cameraMode;

function setCameraMode(mode: CameraMode): void {
  cameraMode = mode;
  app.dataset.cameraMode = mode;
  const run = controller.currentRun;

  if (mode === 'overview') {
    applyOverviewCamera(scene.camera);
    return;
  }

  cameraController.reset();
  if (run) cameraController.update(run, 0);
}

function toggleCamera(): void {
  if (controller.screen !== 'game') return;
  setCameraMode(cameraMode === 'chase' ? 'overview' : 'chase');
}

const keyboard = new KeyboardInput({ onCameraToggle: toggleCamera });

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
  const testWindow = window as typeof window & {
    __SNEK_TEST__?: {
      apiBase: string;
      gatewayKind: string;
      forceGameOver: (result: RunResult) => void;
    };
  };
  testWindow.__SNEK_TEST__ = {
    apiBase: import.meta.env.VITE_RANKING_API_BASE ?? '',
    gatewayKind: sessionGateway.constructor.name,
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

function readInput(): InputState {
  const keyboardState = keyboard.state;
  const joystickState = joystick.state;
  return {
    yaw: clampInputAxis(keyboardState.yaw + joystickState.yaw),
    pitch: clampInputAxis(keyboardState.pitch + joystickState.pitch)
  };
}

function exposeInput(input: InputState): void {
  app.dataset.inputYaw = String(input.yaw);
  app.dataset.inputPitch = String(input.pitch);
  joystickKnob.style.transform = `translate(${input.yaw * 28}px, ${-input.pitch * 28}px)`;
}

function initializeRun(run: RunState): void {
  fixedClock.reset();
  setCameraMode('chase');
  cameraController.reset();
  cameraController.update(run, 0);
}

let activeRun: RunState | null = null;
let lastTimestamp: number | null = null;
let frameId = 0;
let rendererFailed = false;

function frame(timestamp: number): void {
  const input = readInput();
  exposeInput(input);

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
    lifecycle.consumeFrame(frameDeltaSeconds, (dt) => {
      const previousLength = run.snake.segmentCount;
      stepRun(run, input, dt);
      if (cameraMode === 'chase') {
        cameraController.update(run, dt);
      }

      if (
        run.phase === 'game-over'
        || run.phase === 'completed'
        || run.snake.segmentCount !== previousLength
      ) {
        controller.handleRunState(run);
      }
    });
  }

  if (run) {
    snakeRenderer.render({
      headWrapped: run.headWrapped,
      bodyPositions: run.bodyPositions,
      forward: run.forward
    });
    foodRenderer.render(run.food);
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
  if (cameraMode === 'overview') applyOverviewCamera(scene.camera);
}

function handleOrientationChange(): void {
  lifecycle.handleOrientationChange();
  if (cameraMode === 'overview') applyOverviewCamera(scene.camera);
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
