export type GameOverViewModel = {
  length: number;
  best: number;
  worldRank: number | null;
  ranked: boolean;
};

export function renderGameOverView(
  container: HTMLElement,
  model: GameOverViewModel,
  onReplay: () => void,
  onRank: () => void
): void {
  container.replaceChildren();

  const section = document.createElement('section');
  section.className = 'screen game-over';
  section.dataset.view = 'game-over';

  const title = document.createElement('h1');
  title.textContent = 'GAME OVER';

  const metrics = document.createElement('div');
  metrics.className = 'result-metrics';
  const world = model.ranked && model.worldRank !== null ? `#${model.worldRank}` : 'UNRANKED';
  metrics.innerHTML = `
    <p><span>LENGTH</span><strong>${model.length}</strong></p>
    <p><span>BEST</span><strong>${model.best}</strong></p>
    <p><span>WORLD</span><strong>${world}</strong></p>
  `;

  const actions = document.createElement('div');
  actions.className = 'result-actions';

  const replay = document.createElement('button');
  replay.type = 'button';
  replay.dataset.action = 'replay';
  replay.textContent = 'PLAY AGAIN';
  replay.addEventListener('click', onReplay);

  const rank = document.createElement('button');
  rank.type = 'button';
  rank.dataset.action = 'rank';
  rank.textContent = 'RANK';
  rank.addEventListener('click', onRank);

  actions.append(replay, rank);
  section.append(title, metrics, actions);
  container.append(section);
}
