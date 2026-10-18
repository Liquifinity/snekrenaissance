import type { GridDirection } from '../game/grid-types';

const KEY_DIRECTIONS: Readonly<Record<string, GridDirection>> = Object.freeze({
  arrowup: '+Y',
  w: '+Y',
  arrowdown: '-Y',
  s: '-Y',
  arrowleft: '-X',
  a: '-X',
  arrowright: '+X',
  d: '+X',
  q: '+Z',
  e: '-Z'
});

export type KeyboardInputOptions = {
  onDirection?: (direction: GridDirection) => void;
};

function normalizeKey(key: string): string {
  return key.toLowerCase();
}

function directionForKey(key: string): GridDirection | null {
  return KEY_DIRECTIONS[key] ?? null;
}

export class KeyboardInput {
  private readonly pressed = new Set<string>();
  private readonly onDirection?: (direction: GridDirection) => void;

  constructor(options: KeyboardInputOptions = {}) {
    this.onDirection = options.onDirection;
  }

  handleKeyDown(key: string): void {
    const normalized = normalizeKey(key);
    const direction = directionForKey(normalized);
    if (!direction) return;
    if (this.pressed.has(normalized)) return;

    this.pressed.add(normalized);
    this.onDirection?.(direction);
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
      if (directionForKey(normalized)) {
        event.preventDefault();
        this.handleKeyDown(normalized);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const normalized = normalizeKey(event.key);
      if (directionForKey(normalized)) {
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
