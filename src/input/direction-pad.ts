import type { GridDirection } from '../game/grid-types';

const CONTROLS: readonly Readonly<{
  direction: GridDirection;
  label: string;
  className: string;
  ariaLabel: string;
}>[] = Object.freeze([
  { direction: '+Y', label: '↑', className: 'direction-pad-up', ariaLabel: 'Move up' },
  { direction: '-X', label: '←', className: 'direction-pad-left', ariaLabel: 'Move left' },
  { direction: '+X', label: '→', className: 'direction-pad-right', ariaLabel: 'Move right' },
  { direction: '-Y', label: '↓', className: 'direction-pad-down', ariaLabel: 'Move down' },
  { direction: '+Z', label: 'FRENTE', className: 'direction-pad-front', ariaLabel: 'Move front' },
  { direction: '-Z', label: 'FUNDO', className: 'direction-pad-back', ariaLabel: 'Move back' }
]);

export function createDirectionPad(
  onDirection: (direction: GridDirection) => void
): HTMLDivElement {
  const root = document.createElement('div');
  root.className = 'direction-pad';
  root.dataset.directionPad = '';
  root.setAttribute('aria-label', 'World direction controls');

  for (const control of CONTROLS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `direction-pad-button ${control.className}`;
    button.dataset.worldDirection = control.direction;
    button.textContent = control.label;
    button.setAttribute('aria-label', control.ariaLabel);
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      onDirection(control.direction);
    });
    root.append(button);
  }

  return root;
}
