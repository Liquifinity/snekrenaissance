import { AppController } from './app/app-controller';
import { createSessionGateway } from './app/gateway-selection';
import { RuntimeLifecycle } from './app/runtime-lifecycle';
import { FixedStepClock } from './game/simulation';
import { stepRun } from './game/run-state';
import { KeyboardInput } from './input/keyboard';
import { JoystickInput } from './input/joystick';
import { combineInputStates } from './input/input-state';
import { ChaseCameraController } from './render/chase-camera';
import { FoodRenderer } from './render/food-renderer';
import { applyOverviewCamera } from './render/overview-camera';
import { createScene } from './render/scene';
import { SnakeRenderer } from './render/snake-renderer';
import type { RunState } from './game/run-state';
import type { InputState } from './input/input-state';
import './styles.css';

const root = document.querySelector<HTMLElement>('#app');
const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
if (!root || !canvas) throw new Error('missing app root or game canvas');

const gateway = createSessionGateway();
const controller = new AppController({ root, gateway });
controller.mount();

const sceneRuntime = createScene(canvas);
const snakeRenderer = new SnakeRenderer(sceneRuntime.scene);
const foodRenderer = new FoodRenderer(sceneRuntime.scene);
const cameraController = new ChaseCameraController(sceneRuntime.camera);
const fixedClock = new FixedStepClock();
const lifecycle = new RuntimeLifecycle(fixedClock);

let cameraMode: 'chase' | 'overview' = 'chase';
let activeRun: RunState | null = null;
let lastTimestamp: number | null = null;

function toggleCamera(): void {
  cameraMode = cameraMode === 'chase' ? 'overview' : 'chase';
  cameraController.reset();
  if (cameraMode === 'overview') applyOverviewCamera(sceneRuntime.camera);
  const button = document.querySelector<HTMLButtonElement>('[data-camera-toggle]');
  if (button) button.textContent = cameraMode === 'chase' ? 'CAM X' : 'CAM C';
}

const keyboard = new KeyboardInput({ onCameraToggle: toggleCamera });
const detachKeyboard = keyboard.attach(window);

let joystick: JoystickInput | null = null;
let detachJoystick: (() => void) | null = null;

function attachJoystick(): void {
  const element = document.querySelector<HTMLElement>('[data-joystick]');
  if (!element) {
    detachJoystick?.();
    detachJoystick = null;
    joystick = null;
    return;
  }
  if (joystick && detachJoystick) return;
  joystick = new JoystickInput();
  detachJoystick = joystick.attach(element, window);
}

function bindCameraButton(): void {
  const button = document.querySelector<HTMLButtonElement>('[data-camera-toggle]');
  if (!button || button.dataset.bound === 'true') return;
  button.dataset.bound = 'true';
  button.addEventListener('click', toggleCamera);
}

const observer = new MutationObserver(() => {
  attachJoystick();
  bindCameraButton();
});
observer.observe(root, { childList: true, subtree: true });
attachJoystick();
bindCameraButton();

function readInput(): InputState {
  return combineInputStates(keyboard.state, joystick?.state ?? { yaw: 0, pitch: 0 });
}

function exposeInput(input: InputState): void {
  root.dataset.inputYaw = input.yaw.toFixed(3);
  root.dataset.inputPitch = input.pitch.toFixed(3);
}

function initializeRun(run: RunState): void {
  fixedClock.reset();
  lifecycle.reset();
  cameraController.reset();
  if (cameraMode === 'overview') {
    applyOverviewCamera(sceneRuntime.camera);
  } else {
    cameraController.update(run, 0);
  }
}

function resizeRenderer(): void {
  const width = Math.max(1, canvas.clientWidth || window.innerWidth);
  const height = Math.max(1, canvas.clientHeight || window.innerHeight);
  sceneRuntime.renderer.setSize(width, height, false);
  sceneRuntime.camera.aspect = width / height;
  sceneRuntime.camera.updateProjectionMatrix();
}

window.addEventListener('resize', resizeRenderer);
window.addEventListener('orientationchange', resizeRenderer);
resizeRenderer();

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
      const previousLength = run.snake.segments.length;
      stepRun(run, input, dt);
      if (cameraMode === 'chase') {
        cameraController.update(run, dt);
      }

      if (
        run.phase === 'game-over'
        || run.phase === 'completed'
        || run.snake.segments.length !== previousLength
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
      sceneRuntime.renderer.render(sceneRuntime.scene, sceneRuntime.camera);
    } catch (error) {
      rendererFailed = true;
      console.error('Renderer failed:', error);
    }
  }
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

window.addEventListener('beforeunload', () => {
  detachKeyboard();
  detachJoystick?.();
  observer.disconnect();
});
