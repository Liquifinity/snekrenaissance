export type GameOverViewModel = {
  length: number;
  best: number;
  worldRank: number | null;
  ranked: boolean;
  submissionStatus?: 'idle' | 'submitting' | 'accepted' | 'failed';
  submissionError?: string | null;
};

export function renderGameOverView(
  container: HTMLElement,
  model: GameOverViewModel,
  onReplay: () => void,
  onRank: () => void,
  onRetryRank?: () => void
): void {
  container.replaceChildren();

  const submissionStatus = model.submissionStatus ?? 'idle';
  const section = document.createElement('section');
  section.className = 'screen game-over';
  section.dataset.view = 'game-over';
  section.dataset.submissionStatus = submissionStatus;

  const title = document.createElement('h1');
  title.textContent = 'GAME OVER';

  const metrics = document.createElement('div');
  metrics.className = 'result-metrics';

  const metricRows: Array<[string, string]> = model.ranked
    ? [
        ['LENGTH', String(model.length)],
        ['BEST', String(model.best)],
        ['WORLD', model.worldRank !== null ? `#${model.worldRank}` : 'PENDING']
      ]
    : [
        ['SCORE', String(model.length)],
        ['PERSONAL BEST', String(model.best)]
      ];

  for (const [label, value] of metricRows) {
    const row = document.createElement('p');
    const name = document.createElement('span');
    const strong = document.createElement('strong');
    name.textContent = label;
    strong.textContent = value;
    row.append(name, strong);
    metrics.append(row);
  }

  if (model.submissionError) {
    const error = document.createElement('p');
    error.className = 'form-error';
    error.setAttribute('role', 'alert');
    error.textContent = model.submissionError;
    section.append(title, metrics, error);
  } else {
    section.append(title, metrics);
  }

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

  if (submissionStatus === 'failed' && onRetryRank) {
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.dataset.action = 'retry-rank';
    retry.textContent = 'RETRY RANK';
    retry.addEventListener('click', onRetryRank);
    actions.append(retry);
  }

  section.append(actions);
  container.append(section);
}
