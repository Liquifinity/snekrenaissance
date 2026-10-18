import type { ViewCommand } from '../render/view-frame';

const KEY_COMMANDS: Readonly<Record<string, ViewCommand>> = Object.freeze({
  arrowup: 'up',
  w: 'up',
  arrowdown: 'down',
  s: 'down',
  arrowleft: 'left',
  a: 'left',
  arrowright: 'right',
  d: 'right',
  q: 'towardViewer',
  e: 'intoScreen'
});

export type KeyboardInputOptions = {
  onCommand?: (command: ViewCommand) => void;
};

function normalizeKey(key: string): string {
  return key.toLowerCase();
}

function commandForKey(key: string): ViewCommand | null {
  return KEY_COMMANDS[key] ?? null;
}

export class KeyboardInput {
  private readonly pressed = new Set<string>();
  private readonly onCommand?: (command: ViewCommand) => void;

  constructor(options: KeyboardInputOptions = {}) {
    this.onCommand = options.onCommand;
  }

  handleKeyDown(key: string): void {
    const normalized = normalizeKey(key);
    const command = commandForKey(normalized);
    if (!command) return;
    if (this.pressed.has(normalized)) return;

    this.pressed.add(normalized);
    this.onCommand?.(command);
  }

  handleKeyUp(key: string): void {
    this.pressed.delete(normalizeKey(key));
  }

  handleBlur(): void {
    this.pressed.clear();
  }

  attach(target: Window = window): () => void {
    const onKeyDown = (event: KeyboardEvent) => {
      const normalized = normalizeKey(event.key);
      if (commandForKey(normalized)) {
        event.preventDefault();
        this.handleKeyDown(normalized);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const normalized = normalizeKey(event.key);
      if (commandForKey(normalized)) {
        event.preventDefault();
        this.handleKeyUp(normalized);
      }
    };
    const onBlur = () => this.handleBlur();

    target.addEventListener('keydown', onKeyDown);
    target.addEventListener('keyup', onKeyUp);
    target.addEventListener('blur', onBlur);

    return () => {
      target.removeEventListener('keydown', onKeyDown);
      target.removeEventListener('keyup', onKeyUp);
      target.removeEventListener('blur', onBlur);
      this.handleBlur();
    };
  }
}
