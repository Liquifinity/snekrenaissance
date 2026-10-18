import { afterEach, describe, expect, it } from 'vitest';
import type { ViewCommand } from '../../src/render/view-frame';
import { KeyboardInput } from '../../src/input/keyboard';

describe('KeyboardInput V5 edge-triggered view commands', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it.each([
    ['ArrowUp', 'up'], ['w', 'up'],
    ['ArrowDown', 'down'], ['s', 'down'],
    ['ArrowLeft', 'left'], ['a', 'left'],
    ['ArrowRight', 'right'], ['d', 'right'],
    ['e', 'intoScreen']
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
    input.handleKeyDown('e');
    expect(commands).toEqual(['right', 'up', 'intoScreen']);
  });

  it('blur clears pressed edges so the same physical key can emit again', () => {
    const commands: ViewCommand[] = [];
    const input = new KeyboardInput({ onCommand: (command) => commands.push(command) });
    input.handleKeyDown('d');
    input.handleBlur();
    input.handleKeyDown('d');
    expect(commands).toEqual(['right', 'right']);
  });

  it('ignores Q and unrelated keys instead of moving the snake', () => {
    const commands: ViewCommand[] = [];
    const input = new KeyboardInput({ onCommand: (command) => commands.push(command) });
    input.handleKeyDown('q');
    input.handleKeyDown('Q');
    input.handleKeyDown('x');
    input.handleKeyDown('r');
    expect(commands).toEqual([]);
  });

  it('does not consume Q at the window listener', () => {
    const commands: ViewCommand[] = [];
    const keyboard = new KeyboardInput({ onCommand: (command) => commands.push(command) });
    const detach = keyboard.attach(window);

    const event = new KeyboardEvent('keydown', {
      key: 'q',
      bubbles: true,
      cancelable: true
    });
    document.body.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(commands).toEqual([]);
    detach();
  });

  it('does not capture WASD while a text input is focused', () => {
    const commands: ViewCommand[] = [];
    const keyboard = new KeyboardInput({ onCommand: (command) => commands.push(command) });
    const detach = keyboard.attach(window);
    const username = document.createElement('input');
    username.type = 'text';
    document.body.append(username);
    username.focus();

    const event = new KeyboardEvent('keydown', {
      key: 'w',
      bubbles: true,
      cancelable: true
    });
    username.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(commands).toEqual([]);
    detach();
  });

  it('still captures movement keys outside editable controls', () => {
    const commands: ViewCommand[] = [];
    const keyboard = new KeyboardInput({ onCommand: (command) => commands.push(command) });
    const detach = keyboard.attach(window);

    const event = new KeyboardEvent('keydown', {
      key: 'w',
      bubbles: true,
      cancelable: true
    });
    document.body.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(commands).toEqual(['up']);
    detach();
  });
});
