import type { TurnIntent } from '../game/grid-types';

const LEFT_KEYS = new Set(['arrowleft', 'a']);
const RIGHT_KEYS = new Set(['arrowright', 'd']);
const UP_KEYS = new Set(['arrowup', 'w']);
const DOWN_KEYS = new Set(['arrowdown', 's']);
const CAMERA_TOGGLE_KEY = 'x';

type TurnEvent = Exclude<TurnIntent, 'none'>;

export type KeyboardInputOptions = {
  onTurnIntent?: (intent: TurnEvent) => void;
  onCameraToggle?: () => void;
};

function normalizeKey(key: string): string {
  return key.toLowerCase();
}

function turnForKey(key: string): TurnEvent | null {
  if (LEFT_KEYS.has(key)) return 'left';
  if (RIGHT_KEYS.has(key)) return 'right';
  if (UP_KEYS.has(key)) return 'up';
  if (DOWN_KEYS.has(key)) return 'down';
  return null;
}

export class KeyboardInput {
  private readonly pressed = new Set<string>();
  private readonly onTurnIntent?: (intent: TurnEvent) => void;
  private readonly onCameraToggle?: () => void;

  constructor(options: KeyboardInputOptions = {}) {
    this.onTurnIntent = options.onTurnIntent;
    this.onCameraToggle = options.onCameraToggle;
  }

  handleKeyDown(key: string): void {
    const normalized = normalizeKey(key);
    if (!this.isControlKey(normalized)) return;
    if (this.pressed.has(normalized)) return;

    this.pressed.add(normalized);

    if (normalized === CAMERA_TOGGLE_KEY) {
      this.onCameraToggle?.();
      return;
    }

    const intent = turnForKey(normalized);
    if (intent) this.onTurnIntent?.(intent);
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
      if (this.isControlKey(normalized)) {
        event.preventDefault();
        this.handleKeyDown(normalized);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const normalized = normalizeKey(event.key);
      if (this.isControlKey(normalized)) {
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

  private isControlKey(key: string): boolean {
    return key === CAMERA_TOGGLE_KEY
      || LEFT_KEYS.has(key)
      || RIGHT_KEYS.has(key)
      || UP_KEYS.has(key)
      || DOWN_KEYS.has(key);
  }
}
