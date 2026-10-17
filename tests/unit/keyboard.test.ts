import { describe, expect, it } from 'vitest';
import { KeyboardInput } from '../../src/input/keyboard';

describe('KeyboardInput continuous steering state', () => {
  it.each([
    ['ArrowRight', { yaw: 1, pitch: 0 }],
    ['d', { yaw: 1, pitch: 0 }],
    ['ArrowLeft', { yaw: -1, pitch: 0 }],
    ['a', { yaw: -1, pitch: 0 }],
    ['ArrowUp', { yaw: 0, pitch: 1 }],
    ['w', { yaw: 0, pitch: 1 }],
    ['ArrowDown', { yaw: 0, pitch: -1 }],
    ['s', { yaw: 0, pitch: -1 }]
  ] as const)('holds %s continuously until release', (key, expected) => {
    const input = new KeyboardInput();
    input.handleKeyDown(key);
    expect(input.state).toEqual(expected);
    expect(input.state).toEqual(expected);

    input.handleKeyUp(key);
    expect(input.state).toEqual({ yaw: 0, pitch: 0 });
  });

  it('cancels opposing keys on each axis', () => {
    const input = new KeyboardInput();
    input.handleKeyDown('ArrowRight');
    input.handleKeyDown('a');
    input.handleKeyDown('ArrowUp');
    input.handleKeyDown('s');
    expect(input.state).toEqual({ yaw: 0, pitch: 0 });
  });

  it('blur neutralizes held steering', () => {
    const input = new KeyboardInput();
    input.handleKeyDown('d');
    input.handleKeyDown('w');
    input.handleBlur();
    expect(input.state).toEqual({ yaw: 0, pitch: 0 });
  });

  it('toggles camera once per X press edge without changing steering', () => {
    let toggles = 0;
    const input = new KeyboardInput({ onCameraToggle: () => { toggles += 1; } });

    input.handleKeyDown('d');
    input.handleKeyDown('x');
    input.handleKeyDown('x');
    expect(toggles).toBe(1);
    expect(input.state).toEqual({ yaw: 1, pitch: 0 });

    input.handleKeyUp('x');
    input.handleKeyDown('x');
    expect(toggles).toBe(2);
    expect(input.state).toEqual({ yaw: 1, pitch: 0 });
  });
});
