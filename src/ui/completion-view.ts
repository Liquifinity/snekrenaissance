export function renderCompletionView(
  container: HTMLElement,
  onReplay: () => void
): void {
  container.replaceChildren();

  const screen = document.createElement('section');
  screen.className = 'screen completion-screen';
  screen.dataset.view = 'complete';

  const title = document.createElement('h1');
  title.textContent = 'YOUR IMAGE IS COMPLETED';

  const image = document.createElement('img');
  image.className = 'completion-image';
  image.dataset.completionImage = '';
  image.src = `${import.meta.env.BASE_URL}completed-water.webp`;
  image.alt = 'A glass of water';

  const replay = document.createElement('button');
  replay.type = 'button';
  replay.dataset.action = 'replay';
  replay.textContent = 'PLAY AGAIN';
  replay.addEventListener('click', onReplay);

  screen.append(title, image, replay);
  container.append(screen);
}
