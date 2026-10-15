import { neutralInput, type InputState } from './input-state';

const LEFT_KEYS = new Set(['arrowleft', 'a']);
const RIGHT_KEYS = new Set(['arrowright', 'd']);
const UP_KEYS = new Set(['arrowup', 'w']);
const DOWN_KEYS = new Set(['arrowdown', 's']);

function normalizeKey(key: string): string {
  return key.toLowerCase();
}

export class KeyboardInput {
  private readonly pressed = new Set<string>();
  private current: InputState = neutralInput();

  get state(): InputState {
    return { ...this.current };
  }

  handleKeyDown(key: string): void {
    this.pressed.add(normalizeKey(key));
    this.recompute();
  }

  handleKeyUp(key: string): void {
    this.pressed.delete(normalizeKey(key));
    this.recompute();
  }

  handleBlur(): void {
    this.pressed.clear();
    this.current = neutralInput();
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
    return LEFT_KEYS.has(key) || RIGHT_KEYS.has(key) || UP_KEYS.has(key) || DOWN_KEYS.has(key);
  }

  private recompute(): void {
    const left = [...LEFT_KEYS].some((key) => this.pressed.has(key)) ? 1 : 0;
    const right = [...RIGHT_KEYS].some((key) => this.pressed.has(key)) ? 1 : 0;
    const up = [...UP_KEYS].some((key) => this.pressed.has(key)) ? 1 : 0;
    const down = [...DOWN_KEYS].some((key) => this.pressed.has(key)) ? 1 : 0;

    this.current = {
      yaw: right - left,
      pitch: up - down
    };
  }
}
