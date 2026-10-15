export function renderLocalRankView(
  container: HTMLElement,
  best: number,
  onBack: () => void
): void {
  container.replaceChildren();

  const section = document.createElement('section');
  section.className = 'screen local-rank';
  section.dataset.view = 'rank';

  const title = document.createElement('h1');
  title.textContent = 'RANK';

  const status = document.createElement('p');
  status.className = 'rank-status';
  status.textContent = 'UNRANKED — public leaderboard comes with the server layer.';

  const bestLine = document.createElement('p');
  bestLine.className = 'rank-best';
  bestLine.textContent = `BEST ${best}`;

  const back = document.createElement('button');
  back.type = 'button';
  back.dataset.action = 'back';
  back.textContent = 'BACK';
  back.addEventListener('click', onBack);

  section.append(title, status, bestLine, back);
  container.append(section);
}
