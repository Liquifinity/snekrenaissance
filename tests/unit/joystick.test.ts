import { describe, expect, it } from 'vitest';
import {
  JOYSTICK_ACTIVATION_THRESHOLD,
  JOYSTICK_REARM_THRESHOLD,
  JoystickInput
} from '../../src/input/joystick';

describe('JoystickInput discrete intents', () => {
  it('uses the approved activation and rearm thresholds', () => {
    expect(JOYSTICK_ACTIVATION_THRESHOLD).toBe(0.55);
    expect(JOYSTICK_REARM_THRESHOLD).toBe(0.25);
  });

  it('resolves the dominant axis to one local turn intent', () => {
    const left = new JoystickInput();
    left.begin(1, 0, 0, 0, 0, 100);
    left.move(1, -70, -20);
    expect(left.takeIntent()).toBe('left');

    const right = new JoystickInput();
    right.begin(2, 0, 0, 0, 0, 100);
    right.move(2, 70, 20);
    expect(right.takeIntent()).toBe('right');

    const up = new JoystickInput();
    up.begin(3, 0, 0, 0, 0, 100);
    up.move(3, 10, -70);
    expect(up.takeIntent()).toBe('up');

    const down = new JoystickInput();
    down.begin(4, 0, 0, 0, 0, 100);
    down.move(4, -10, 70);
    expect(down.takeIntent()).toBe('down');
  });

  it('emits at most one intent while a deflection remains held', () => {
    const joystick = new JoystickInput();
    joystick.begin(1, 0, 0, 0, 0, 100);
    joystick.move(1, -70, 0);
    expect(joystick.takeIntent()).toBe('left');

    joystick.move(1, -90, 0);
    expect(joystick.takeIntent()).toBe('none');
  });

  it('requires rearm near center before a new deflection can emit', () => {
    const joystick = new JoystickInput();
    joystick.begin(1, 0, 0, 0, 0, 100);
    joystick.move(1, -70, 0);
    expect(joystick.takeIntent()).toBe('left');

    joystick.move(1, 0, -40);
    expect(joystick.takeIntent()).toBe('none');

    joystick.move(1, 20, 0);
    expect(joystick.takeIntent()).toBe('none');

    joystick.move(1, 0, -70);
    expect(joystick.takeIntent()).toBe('up');
  });

  it('pointer end and cancel clear pending intent and pointer state', () => {
    const ended = new JoystickInput();
    ended.begin(7, -70, 0, 0, 0, 100);
    ended.end(7);
    expect(ended.takeIntent()).toBe('none');
    expect(ended.activePointerId).toBeNull();

    const cancelled = new JoystickInput();
    cancelled.begin(8, 70, 0, 0, 0, 100);
    cancelled.cancel(8);
    expect(cancelled.takeIntent()).toBe('none');
    expect(cancelled.activePointerId).toBeNull();
  });

  it('reset clears stale input and rearms after resize/orientation changes', () => {
    const joystick = new JoystickInput();
    joystick.begin(4, -70, 0, 0, 0, 100);
    joystick.reset();

    expect(joystick.takeIntent()).toBe('none');
    expect(joystick.activePointerId).toBeNull();

    joystick.begin(5, 0, -70, 0, 0, 100);
    expect(joystick.takeIntent()).toBe('up');
  });
});
