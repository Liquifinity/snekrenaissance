import './styles.css';
import { AppController } from './app/app-controller';
import { FoodRenderer } from './render/food-renderer';
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
const controller = new AppController({ root: app });
controller.mount();

function resize(): void {
  const rect = canvas.getBoundingClientRect();
  scene.resize(rect.width, rect.height);
}

let frameId = 0;
function frame(): void {
  const run = controller.currentRun;
  if (run) {
    snakeRenderer.render(run);
    foodRenderer.render(run.food);
  }
  scene.render();
  frameId = requestAnimationFrame(frame);
}

resize();
frameId = requestAnimationFrame(frame);

window.addEventListener('resize', resize);
window.addEventListener('pagehide', () => {
  cancelAnimationFrame(frameId);
  snakeRenderer.dispose();
  foodRenderer.dispose();
  scene.dispose();
}, { once: true });
