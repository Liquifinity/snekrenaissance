import type { ViewCommand } from '../render/view-frame';

const CONTROLS: readonly Readonly<{
  command: ViewCommand;
  label: string;
  className: string;
  ariaLabel: string;
}>[] = Object.freeze([
  { command: 'up', label: '↑', className: 'direction-pad-up', ariaLabel: 'Move up' },
  { command: 'left', label: '←', className: 'direction-pad-left', ariaLabel: 'Move left' },
  { command: 'right', label: '→', className: 'direction-pad-right', ariaLabel: 'Move right' },
  { command: 'down', label: '↓', className: 'direction-pad-down', ariaLabel: 'Move down' },
  { command: 'towardViewer', label: 'FRENTE', className: 'direction-pad-front', ariaLabel: 'Move toward viewer' },
  { command: 'intoScreen', label: 'FUNDO', className: 'direction-pad-back', ariaLabel: 'Move into screen' }
]);

export function createDirectionPad(
  onCommand: (command: ViewCommand) => void
): HTMLDivElement {
  const root = document.createElement('div');
  root.className = 'direction-pad';
  root.dataset.directionPad = '';
  root.setAttribute('aria-label', 'View-relative direction controls');

  const containPointerEvent = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
  };
  for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'] as const) {
    root.addEventListener(type, containPointerEvent);
  }

  for (const control of CONTROLS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `direction-pad-button ${control.className}`;
    button.dataset.viewCommand = control.command;
    button.textContent = control.label;
    button.setAttribute('aria-label', control.ariaLabel);
    button.addEventListener('pointerdown', () => {
      onCommand(control.command);
    });
    root.append(button);
  }

  return root;
}
