import { describe, expect, it } from 'vitest';
import { KeyboardInput } from '../../src/input/keyboard';

describe('KeyboardInput discrete intents', () => {
  it.each([
    ['ArrowLeft', 'left'],
    ['a', 'left'],
    ['ArrowRight', 'right'],
    ['d', 'right'],
    ['ArrowUp', 'up'],
    ['w', 'up'],
    ['ArrowDown', 'down'],
    ['s', 'down']
  ] as const)('maps %s to one %s intent per press edge', (key, intent) => {
    const input = new KeyboardInput();
    input.handleKeyDown(key);
    expect(input.takeIntent()).toBe(intent);
    expect(input.takeIntent()).toBe('none');

    input.handleKeyDown(key);
    expect(input.takeIntent()).toBe('none');

    input.handleKeyUp(key);
    input.handleKeyDown(key);
    expect(input.takeIntent()).toBe(intent);
  });

  it('buffers at most one not-yet-drained movement intent', () => {
    const input = new KeyboardInput();
    input.handleKeyDown('a');
    input.handleKeyDown('w');
    expect(input.takeIntent()).toBe('left');
    expect(input.takeIntent()).toBe('none');
  });

  it('toggles camera once per X press and never emits X as movement', () => {
    let toggles = 0;
    const input = new KeyboardInput({ onCameraToggle: () => { toggles += 1; } });

    input.handleKeyDown('x');
    input.handleKeyDown('x');
    expect(toggles).toBe(1);
    expect(input.takeIntent()).toBe('none');

    input.handleKeyUp('x');
    input.handleKeyDown('x');
    expect(toggles).toBe(2);
    expect(input.takeIntent()).toBe('none');
  });

  it('blur clears held state and any pending intent', () => {
    const input = new KeyboardInput();
    input.handleKeyDown('ArrowRight');
    input.handleBlur();
    expect(input.takeIntent()).toBe('none');

    input.handleKeyDown('ArrowRight');
    expect(input.takeIntent()).toBe('right');
  });
});
