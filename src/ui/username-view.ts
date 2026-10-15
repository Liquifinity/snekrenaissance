export function renderUsernameView(
  container: HTMLElement,
  initialUsername: string,
  onPlay: (username: string) => void
): void {
  container.replaceChildren();

  const section = document.createElement('section');
  section.className = 'screen screen-username';
  section.dataset.view = 'username';

  const form = document.createElement('form');
  form.className = 'username-form';

  const label = document.createElement('label');
  label.htmlFor = 'username';
  label.textContent = 'username:';

  const input = document.createElement('input');
  input.id = 'username';
  input.name = 'username';
  input.type = 'text';
  input.autocomplete = 'nickname';
  input.maxLength = 24;
  input.value = initialUsername;

  const error = document.createElement('p');
  error.className = 'form-error';
  error.setAttribute('role', 'alert');

  const play = document.createElement('button');
  play.type = 'submit';
  play.dataset.action = 'play';
  play.textContent = 'PLAY';

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const username = input.value.trim();
    if (!username) {
      error.textContent = 'enter a username.';
      input.focus();
      return;
    }
    error.textContent = '';
    onPlay(username);
  });

  form.append(label, input, error, play);
  section.append(form);
  container.append(section);
  input.focus();
}
