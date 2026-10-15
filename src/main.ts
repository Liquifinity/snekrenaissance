import './styles.css';
import { createRun } from './game/run-state';
import { FoodRenderer } from './render/food-renderer';
import { createScene } from './render/scene';
import { SnakeRenderer } from './render/snake-renderer';

const canvasCandidate = document.querySelector<HTMLCanvasElement>('#game-canvas');
if (!canvasCandidate) {
  throw new Error('Missing #game-canvas.');
}
const canvas = canvasCandidate;

const scene = createScene(canvas);
const snakeRenderer = new SnakeRenderer(scene.scene);
const foodRenderer = new FoodRenderer(scene.scene);
const run = createRun();

function resize(): void {
  const rect = canvas.getBoundingClientRect();
  scene.resize(rect.width, rect.height);
}

function render(): void {
  snakeRenderer.render(run);
  foodRenderer.render(run.food);
  scene.render();
}

resize();
render();
window.addEventListener('resize', () => {
  resize();
  render();
});

window.addEventListener('pagehide', () => {
  snakeRenderer.dispose();
  foodRenderer.dispose();
  scene.dispose();
}, { once: true });
