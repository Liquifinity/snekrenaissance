export function renderHudView(container: HTMLElement, length: number): void {
  container.replaceChildren();

  const hud = document.createElement('section');
  hud.className = 'game-hud';
  hud.dataset.view = 'game';

  const metric = document.createElement('div');
  metric.className = 'hud-metric';
  metric.dataset.hudLength = '';
  metric.textContent = `LENGTH ${length}`;

  const rank = document.createElement('div');
  rank.className = 'hud-metric hud-rank';
  rank.textContent = 'RANK —';

  hud.append(metric, rank);
  container.append(hud);
}
