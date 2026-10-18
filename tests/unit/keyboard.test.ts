import { describe, expect, it } from 'vitest';
import { KeyboardInput } from '../../src/input/keyboard';

describe('KeyboardInput V4 edge-triggered world directions', () => {
  it.each([
    ['ArrowUp', '+Y'], ['w', '+Y'],
    ['ArrowDown', '-Y'], ['s', '-Y'],
    ['ArrowLeft', '-X'], ['a', '-X'],
    ['ArrowRight', '+X'], ['d', '+X'],
    ['q', '+Z'], ['e', '-Z']
  ] as const)('maps %s to one %s direction per press edge', (key, expected) => {
    const directions: string[] = [];
    const input = new KeyboardInput({ onDirection: (direction) => directions.push(direction) } as never);

    input.handleKeyDown(key);
    input.handleKeyDown(key);
    input.handleKeyDown(key);
    expect(directions).toEqual([expected]);

    input.handleKeyUp(key);
    input.handleKeyDown(key);
    expect(directions).toEqual([expected, expected]);
  });

  it('allows a newer different world direction before earlier keys are released', () => {
    const directions: string[] = [];
    const input = new KeyboardInput({ onDirection: (direction: string) => directions.push(direction) } as never);
    input.handleKeyDown('d');
    input.handleKeyDown('w');
    input.handleKeyDown('q');
    expect(directions).toEqual(['+X', '+Y', '+Z']);
  });

  it('blur clears pressed edges so the same physical key can emit again', () => {
    const directions: string[] = [];
    const input = new KeyboardInput({ onDirection: (direction: string) => directions.push(direction) } as never);
    input.handleKeyDown('d');
    input.handleBlur();
    input.handleKeyDown('d');
    expect(directions).toEqual(['+X', '+X']);
  });

  it('ignores X and unrelated keys instead of toggling camera', () => {
    const directions: string[] = [];
    const input = new KeyboardInput({ onDirection: (direction: string) => directions.push(direction) } as never);
    input.handleKeyDown('x');
    input.handleKeyDown('r');
    expect(directions).toEqual([]);
  });
});
