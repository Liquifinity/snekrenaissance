import { describe, expect, it } from 'vitest';
import type { ViewCommand } from '../../src/render/view-frame';
import { KeyboardInput } from '../../src/input/keyboard';

describe('KeyboardInput V5 edge-triggered view commands', () => {
  it.each([
    ['ArrowUp', 'up'], ['w', 'up'],
    ['ArrowDown', 'down'], ['s', 'down'],
    ['ArrowLeft', 'left'], ['a', 'left'],
    ['ArrowRight', 'right'], ['d', 'right'],
    ['q', 'towardViewer'], ['e', 'intoScreen']
  ] as const)('maps %s to one %s command per press edge', (key, expected) => {
    const commands: ViewCommand[] = [];
    const input = new KeyboardInput({ onCommand: (command: ViewCommand) => commands.push(command) });

    input.handleKeyDown(key);
    input.handleKeyDown(key);
    input.handleKeyDown(key);
    expect(commands).toEqual([expected]);

    input.handleKeyUp(key);
    input.handleKeyDown(key);
    expect(commands).toEqual([expected, expected]);
  });

  it('allows a newer different view command before earlier keys are released', () => {
    const commands: ViewCommand[] = [];
    const input = new KeyboardInput({ onCommand: (command) => commands.push(command) });
    input.handleKeyDown('d');
    input.handleKeyDown('w');
    input.handleKeyDown('q');
    expect(commands).toEqual(['right', 'up', 'towardViewer']);
  });

  it('blur clears pressed edges so the same physical key can emit again', () => {
    const commands: ViewCommand[] = [];
    const input = new KeyboardInput({ onCommand: (command) => commands.push(command) });
    input.handleKeyDown('d');
    input.handleBlur();
    input.handleKeyDown('d');
    expect(commands).toEqual(['right', 'right']);
  });

  it('ignores X and unrelated keys instead of toggling camera', () => {
    const commands: ViewCommand[] = [];
    const input = new KeyboardInput({ onCommand: (command) => commands.push(command) });
    input.handleKeyDown('x');
    input.handleKeyDown('r');
    expect(commands).toEqual([]);
  });
});
