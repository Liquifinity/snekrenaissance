export const CANONICAL_COPY = [
  'just because ChatGPT',
  'didnt complete my image.'
] as const;

export function renderIntroView(container: HTMLElement, onContinue: () => void): void {
  container.replaceChildren();

  const section = document.createElement('section');
  section.className = 'screen screen-intro';
  section.dataset.view = 'intro';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'meme-copy';
  button.dataset.action = 'continue';
  button.setAttribute('aria-label', `${CANONICAL_COPY[0]} ${CANONICAL_COPY[1]}`);

  for (const line of CANONICAL_COPY) {
    const span = document.createElement('span');
    span.dataset.copyLine = '';
    span.textContent = line;
    button.append(span);
  }

  button.addEventListener('click', onContinue);
  section.append(button);
  container.append(section);
}
