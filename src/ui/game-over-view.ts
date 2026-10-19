export type GameOverViewModel = {
  score: number;
  best: number;
};

export function renderGameOverView(
  container: HTMLElement,
  model: GameOverViewModel,
  onReplay: () => void,
  onBest: () => void
): void {
  container.replaceChildren();

  const section = document.createElement('section');
  section.className = 'screen game-over';
  section.dataset.view = 'game-over';

  const title = document.createElement('h1');
  title.textContent = 'GAME OVER';

  const metrics = document.createElement('div');
  metrics.className = 'result-metrics';

  for (const [label, value] of [
    ['SCORE', String(model.score)],
    ['PERSONAL BEST', String(model.best)]
  ] as const) {
    const row = document.createElement('p');
    const name = document.createElement('span');
    const strong = document.createElement('strong');
    name.textContent = label;
    strong.textContent = value;
    row.append(name, strong);
    metrics.append(row);
  }

  const actions = document.createElement('div');
  actions.className = 'result-actions';

  const replay = document.createElement('button');
  replay.type = 'button';
  replay.dataset.action = 'replay';
  replay.textContent = 'PLAY AGAIN';
  replay.addEventListener('click', onReplay);

  const best = document.createElement('button');
  best.type = 'button';
  best.dataset.action = 'best';
  best.textContent = 'BEST';
  best.addEventListener('click', onBest);

  actions.append(replay, best);
  section.append(title, metrics, actions);
  container.append(section);
}
