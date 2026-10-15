import { describe, expect, it } from 'vitest';
import { JoystickInput } from '../../src/input/joystick';

describe('JoystickInput', () => {
  it('maps pointer displacement to normalized yaw and pitch', () => {
    const joystick = new JoystickInput();
    joystick.begin(7, 100, 100, 100, 100, 50);
    joystick.move(7, 125, 75);

    expect(joystick.state.yaw).toBeCloseTo(0.5);
    expect(joystick.state.pitch).toBeCloseTo(0.5);
  });

  it('clamps movement outside joystick radius to the unit circle', () => {
    const joystick = new JoystickInput();
    joystick.begin(1, 0, 0, 0, 0, 40);
    joystick.move(1, 100, -100);

    expect(Math.abs(joystick.state.yaw)).toBeLessThanOrEqual(1);
    expect(Math.abs(joystick.state.pitch)).toBeLessThanOrEqual(1);
    expect(Math.hypot(joystick.state.yaw, joystick.state.pitch)).toBeCloseTo(1);
  });

  it('pointerup resets to neutral', () => {
    const joystick = new JoystickInput();
    joystick.begin(2, 0, 0, 0, 0, 50);
    joystick.move(2, 20, -20);
    joystick.end(2);
    expect(joystick.state).toEqual({ yaw: 0, pitch: 0 });
  });

  it('pointercancel resets to neutral', () => {
    const joystick = new JoystickInput();
    joystick.begin(3, 0, 0, 0, 0, 50);
    joystick.move(3, -20, 20);
    joystick.cancel(3);
    expect(joystick.state).toEqual({ yaw: 0, pitch: 0 });
  });

  it('reset clears stale pointer state after resize or orientation change', () => {
    const joystick = new JoystickInput();
    joystick.begin(4, 0, 0, 0, 0, 50);
    joystick.move(4, 25, 0);
    joystick.reset();

    expect(joystick.state).toEqual({ yaw: 0, pitch: 0 });
    expect(joystick.activePointerId).toBeNull();

    joystick.move(4, 50, 0);
    expect(joystick.state).toEqual({ yaw: 0, pitch: 0 });
  });
});
