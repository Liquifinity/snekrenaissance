import { describe, expect, it } from 'vitest';
import { KeyboardInput } from '../../src/input/keyboard';

describe('KeyboardInput V3 edge-triggered turn events', () => {
  it.each([
    ['ArrowRight', 'right'],
    ['d', 'right'],
    ['ArrowLeft', 'left'],
    ['a', 'left'],
    ['ArrowUp', 'up'],
    ['w', 'up'],
    ['ArrowDown', 'down'],
    ['s', 'down']
  ] as const)('maps %s to one %s intent per press edge', (key, expected) => {
    const intents: string[] = [];
    const input = new KeyboardInput({ onTurnIntent: (intent) => intents.push(intent) });

    input.handleKeyDown(key);
    input.handleKeyDown(key);
    input.handleKeyDown(key);
    expect(intents).toEqual([expected]);

    input.handleKeyUp(key);
    input.handleKeyDown(key);
    expect(intents).toEqual([expected, expected]);
  });

  it('allows a newer different key to emit before earlier keys are released', () => {
    const intents: string[] = [];
    const input = new KeyboardInput({ onTurnIntent: (intent) => intents.push(intent) });

    input.handleKeyDown('d');
    input.handleKeyDown('w');
    input.handleKeyDown('a');

    expect(intents).toEqual(['right', 'up', 'left']);
  });

  it('blur clears pressed edges so the same physical key can emit again', () => {
    const intents: string[] = [];
    const input = new KeyboardInput({ onTurnIntent: (intent) => intents.push(intent) });

    input.handleKeyDown('d');
    input.handleBlur();
    input.handleKeyDown('d');

    expect(intents).toEqual(['right', 'right']);
  });

  it('toggles camera once per X press without emitting a turn', () => {
    let toggles = 0;
    const intents: string[] = [];
    const input = new KeyboardInput({
      onTurnIntent: (intent) => intents.push(intent),
      onCameraToggle: () => { toggles += 1; }
    });

    input.handleKeyDown('x');
    input.handleKeyDown('x');
    expect(toggles).toBe(1);
    expect(intents).toEqual([]);

    input.handleKeyUp('x');
    input.handleKeyDown('x');
    expect(toggles).toBe(2);
    expect(intents).toEqual([]);
  });

  it('ignores unrelated keys', () => {
    const intents: string[] = [];
    const input = new KeyboardInput({ onTurnIntent: (intent) => intents.push(intent) });
    input.handleKeyDown('q');
    expect(intents).toEqual([]);
  });
});
