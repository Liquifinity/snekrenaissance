import { describe, expect, it } from 'vitest';
import { JOYSTICK_DEADZONE, JoystickInput } from '../../src/input/joystick';

function expectStateClose(actual: { yaw: number; pitch: number }, expected: { yaw: number; pitch: number }): void {
  expect(actual.yaw).toBeCloseTo(expected.yaw, 6);
  expect(actual.pitch).toBeCloseTo(expected.pitch, 6);
}

describe('JoystickInput continuous steering state', () => {
  it('uses the approved radial deadzone', () => {
    expect(JOYSTICK_DEADZONE).toBe(0.15);
  });

  it('uses the same four axis signs as keyboard controls', () => {
    const joystick = new JoystickInput();
    joystick.begin(1, 0, 0, 0, 0, 100);

    joystick.move(1, 100, 0);
    expectStateClose(joystick.state, { yaw: 1, pitch: 0 });
    joystick.move(1, -100, 0);
    expectStateClose(joystick.state, { yaw: -1, pitch: 0 });
    joystick.move(1, 0, -100);
    expectStateClose(joystick.state, { yaw: 0, pitch: 1 });
    joystick.move(1, 0, 100);
    expectStateClose(joystick.state, { yaw: 0, pitch: -1 });
  });

  it('keeps small radial motion neutral and rescales outside the deadzone', () => {
    const joystick = new JoystickInput();
    joystick.begin(2, 0, 0, 0, 0, 100);

    joystick.move(2, 10, 0);
    expectStateClose(joystick.state, { yaw: 0, pitch: 0 });

    joystick.move(2, 70, 0);
    expect(joystick.state.yaw).toBeCloseTo((0.7 - 0.15) / 0.85, 6);
    expect(joystick.state.pitch).toBeCloseTo(0, 6);
  });

  it('preserves direction and proportional magnitude for diagonal deflection', () => {
    const joystick = new JoystickInput();
    joystick.begin(3, 0, 0, 0, 0, 100);
    joystick.move(3, 30, -40);

    const rescaledMagnitude = (0.5 - 0.15) / 0.85;
    expect(joystick.state.yaw).toBeCloseTo(rescaledMagnitude * 0.6, 6);
    expect(joystick.state.pitch).toBeCloseTo(rescaledMagnitude * 0.8, 6);
  });

  it('moves right through center to left without rearm or stale commands', () => {
    const joystick = new JoystickInput();
    joystick.begin(4, 0, 0, 0, 0, 100);
    joystick.move(4, 80, 0);
    expect(joystick.state.yaw).toBeGreaterThan(0);

    joystick.move(4, 0, 0);
    expectStateClose(joystick.state, { yaw: 0, pitch: 0 });

    joystick.move(4, -80, 0);
    expect(joystick.state.yaw).toBeLessThan(0);
  });

  it('end, cancel, and reset neutralize pointer state', () => {
    const ended = new JoystickInput();
    ended.begin(5, 80, 0, 0, 0, 100);
    ended.end(5);
    expectStateClose(ended.state, { yaw: 0, pitch: 0 });
    expect(ended.activePointerId).toBeNull();

    const cancelled = new JoystickInput();
    cancelled.begin(6, 0, -80, 0, 0, 100);
    cancelled.cancel(6);
    expectStateClose(cancelled.state, { yaw: 0, pitch: 0 });
    expect(cancelled.activePointerId).toBeNull();

    const reset = new JoystickInput();
    reset.begin(7, -80, 0, 0, 0, 100);
    reset.reset();
    expectStateClose(reset.state, { yaw: 0, pitch: 0 });
    expect(reset.activePointerId).toBeNull();
  });
});
