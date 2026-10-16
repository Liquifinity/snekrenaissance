import { completionProgress, completionProgressLabel } from '../game/progress';

export function renderHudView(container: HTMLElement, length: number, foodEaten = 0): void {
  container.replaceChildren();

  const hud = document.createElement('section');
  hud.className = 'game-hud';
  hud.dataset.view = 'game';

  const progress = document.createElement('div');
  progress.className = 'progress-shell';

  const progressTrack = document.createElement('div');
  progressTrack.className = 'progress-track';
  progressTrack.dataset.progressTrack = '';
  progressTrack.setAttribute('role', 'progressbar');
  progressTrack.setAttribute('aria-valuemin', '0');
  progressTrack.setAttribute('aria-valuemax', '100');
  const percent = completionProgress(foodEaten);
  progressTrack.setAttribute('aria-valuenow', percent.toFixed(1));

  const progressFill = document.createElement('div');
  progressFill.className = 'progress-fill';
  progressFill.dataset.progressFill = '';
  progressFill.style.width = `${percent}%`;
  progressTrack.append(progressFill);

  const progressLabel = document.createElement('span');
  progressLabel.className = 'progress-label';
  progressLabel.dataset.progressLabel = '';
  progressLabel.textContent = completionProgressLabel(foodEaten);

  progress.append(progressTrack, progressLabel);

  const metrics = document.createElement('div');
  metrics.className = 'hud-metrics';

  const metric = document.createElement('div');
  metric.className = 'hud-metric';
  metric.dataset.hudLength = '';
  metric.textContent = `LENGTH ${length}`;

  const hint = document.createElement('div');
  hint.className = 'hud-metric camera-hint';
  hint.textContent = 'PRESS X TO CHANGE CAMERA';

  metrics.append(metric, hint);
  hud.append(progress, metrics);
  container.append(hud);
}
