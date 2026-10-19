export function renderPersonalBestView(
  container: HTMLElement,
  best: number,
  onBack: () => void
): void {
  container.replaceChildren();

  const section = document.createElement('section');
  section.className = 'screen personal-best';
  section.dataset.view = 'best';

  const title = document.createElement('h1');
  title.textContent = 'PERSONAL BEST';

  const bestLine = document.createElement('p');
  bestLine.className = 'best-value';
  bestLine.textContent = String(best);

  const back = document.createElement('button');
  back.type = 'button';
  back.dataset.action = 'back';
  back.textContent = 'BACK';
  back.addEventListener('click', onBack);

  section.append(title, bestLine, back);
  container.append(section);
}
