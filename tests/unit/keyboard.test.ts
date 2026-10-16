import { describe, expect, it } from 'vitest';
import { KeyboardInput } from '../../src/input/keyboard';

describe('KeyboardInput', () => {
  it('maps arrows and WASD to camera-relative yaw/pitch signs', () => {
    const input = new KeyboardInput();

    input.handleKeyDown('ArrowLeft');
    expect(input.state.yaw).toBe(1);
    input.handleKeyUp('ArrowLeft');

    input.handleKeyDown('d');
    expect(input.state.yaw).toBe(-1);
    input.handleKeyUp('d');

    input.handleKeyDown('w');
    expect(input.state.pitch).toBe(1);
    input.handleKeyUp('w');

    input.handleKeyDown('ArrowDown');
    expect(input.state.pitch).toBe(-1);
  });

  it('releasing a key returns its axis toward neutral', () => {
    const input = new KeyboardInput();
    input.handleKeyDown('a');
    input.handleKeyDown('w');
    input.handleKeyUp('a');

    expect(input.state).toEqual({ yaw: 0, pitch: 1 });
  });

  it('opposite keys cancel on the same axis', () => {
    const input = new KeyboardInput();
    input.handleKeyDown('a');
    input.handleKeyDown('d');
    expect(input.state.yaw).toBe(0);
  });

  it('blur clears every pressed key', () => {
    const input = new KeyboardInput();
    input.handleKeyDown('ArrowRight');
    input.handleKeyDown('ArrowUp');
    input.handleBlur();
    expect(input.state).toEqual({ yaw: 0, pitch: 0 });
  });
});
