import { describe, expect, it } from 'vitest';
import {
  JOYSTICK_DEADZONE,
  JOYSTICK_SECTOR_HYSTERESIS_DEGREES,
  JoystickInput,
  type JoystickSector
} from '../../src/input/joystick';

function point(angleDegrees: number, magnitude = 0.8, radius = 100) {
  const radians = angleDegrees * Math.PI / 180;
  return {
    x: Math.cos(radians) * magnitude * radius,
    y: -Math.sin(radians) * magnitude * radius
  };
}

function beginAt(
  joystick: JoystickInput,
  pointerId: number,
  angleDegrees: number,
  magnitude = 0.8
): void {
  const position = point(angleDegrees, magnitude);
  joystick.begin(pointerId, position.x, position.y, 0, 0, 100);
}

function moveTo(
  joystick: JoystickInput,
  pointerId: number,
  angleDegrees: number,
  magnitude = 0.8
): void {
  const position = point(angleDegrees, magnitude);
  joystick.move(pointerId, position.x, position.y);
}

describe('JoystickInput V3 sector state machine', () => {
  it('uses the approved deadzone and hysteresis constants', () => {
    expect(JOYSTICK_DEADZONE).toBe(0.15);
    expect(JOYSTICK_SECTOR_HYSTERESIS_DEGREES).toBe(10);
  });

  it('keeps magnitude at or inside the radial deadzone neutral', () => {
    const intents: string[] = [];
    const joystick = new JoystickInput({ onTurnIntent: (intent) => intents.push(intent) });
    joystick.begin(1, 15, 0, 0, 0, 100);

    expect(joystick.sector).toBe('neutral');
    expect(intents).toEqual([]);

    joystick.move(1, 15.01, 0);
    expect(joystick.sector).toBe('right');
    expect(intents).toEqual(['right']);
  });

  it.each([
    [0, 'right'],
    [90, 'up'],
    [180, 'left'],
    [-90, 'down']
  ] as const)('enters %s° as %s from neutral', (angle, sector) => {
    const intents: string[] = [];
    const joystick = new JoystickInput({ onTurnIntent: (intent) => intents.push(intent) });
    beginAt(joystick, 2, angle);

    expect(joystick.sector).toBe(sector);
    expect(intents).toEqual([sector]);
  });

  it('prefers the horizontal sector on an exact 45-degree diagonal from neutral', () => {
    const intents: string[] = [];
    const joystick = new JoystickInput({ onTurnIntent: (intent) => intents.push(intent) });
    beginAt(joystick, 3, 45);

    expect(joystick.sector).toBe('right');
    expect(intents).toEqual(['right']);
  });

  it('emits once when entering a sector and never repeats while remaining there', () => {
    const intents: string[] = [];
    const joystick = new JoystickInput({ onTurnIntent: (intent) => intents.push(intent) });
    beginAt(joystick, 4, 0);
    moveTo(joystick, 4, 5);
    moveTo(joystick, 4, -5);

    expect(joystick.sector).toBe('right');
    expect(intents).toEqual(['right']);
  });

  it.each([
    ['right', 0, 55, 55.1, 'up'],
    ['up', 90, 145, 145.1, 'left'],
    ['left', 180, -125, -124.9, 'down'],
    ['down', -90, -35, -34.9, 'right']
  ] as const)(
    'keeps %s through its exact hysteresis boundary then switches beyond it',
    (initialSector, initialAngle, boundaryAngle, beyondAngle, expectedSector) => {
      const intents: string[] = [];
      const joystick = new JoystickInput({ onTurnIntent: (intent) => intents.push(intent) });
      beginAt(joystick, 5, initialAngle);
      expect(joystick.sector).toBe(initialSector as JoystickSector);

      moveTo(joystick, 5, boundaryAngle);
      expect(joystick.sector).toBe(initialSector as JoystickSector);
      expect(intents).toEqual([initialSector]);

      moveTo(joystick, 5, beyondAngle);
      expect(joystick.sector).toBe(expectedSector as JoystickSector);
      expect(intents).toEqual([initialSector, expectedSector]);
    }
  );

  it('allows a direct unambiguous non-neutral sector change without pointer-up', () => {
    const intents: string[] = [];
    const joystick = new JoystickInput({ onTurnIntent: (intent) => intents.push(intent) });
    beginAt(joystick, 6, 0);
    moveTo(joystick, 6, 180);

    expect(joystick.sector).toBe('left');
    expect(intents).toEqual(['right', 'left']);
  });

  it('returning to neutral emits nothing and re-arms the same sector', () => {
    const intents: string[] = [];
    const joystick = new JoystickInput({ onTurnIntent: (intent) => intents.push(intent) });
    beginAt(joystick, 7, 0);
    joystick.move(7, 0, 0);
    expect(joystick.sector).toBe('neutral');
    expect(intents).toEqual(['right']);

    moveTo(joystick, 7, 0);
    expect(joystick.sector).toBe('right');
    expect(intents).toEqual(['right', 'right']);
  });

  it('keeps normalized/clamped analog coordinates only as a visual vector', () => {
    const joystick = new JoystickInput();
    joystick.begin(8, 200, -200, 0, 0, 100);

    expect(Math.hypot(joystick.visualVector.x, joystick.visualVector.y)).toBeCloseTo(1, 10);
    expect(joystick.visualVector.x).toBeGreaterThan(0);
    expect(joystick.visualVector.y).toBeGreaterThan(0);
  });

  it('end, cancel and reset return sector/vector/pointer to neutral', () => {
    const ended = new JoystickInput();
    beginAt(ended, 9, 0);
    ended.end(9);
    expect(ended.sector).toBe('neutral');
    expect(ended.visualVector).toEqual({ x: 0, y: 0 });
    expect(ended.activePointerId).toBeNull();

    const cancelled = new JoystickInput();
    beginAt(cancelled, 10, 90);
    cancelled.cancel(10);
    expect(cancelled.sector).toBe('neutral');
    expect(cancelled.visualVector).toEqual({ x: 0, y: 0 });

    const reset = new JoystickInput();
    beginAt(reset, 11, 180);
    reset.reset();
    expect(reset.sector).toBe('neutral');
    expect(reset.visualVector).toEqual({ x: 0, y: 0 });
  });

  it('ignores moves from a pointer that does not own the joystick', () => {
    const intents: string[] = [];
    const joystick = new JoystickInput({ onTurnIntent: (intent) => intents.push(intent) });
    beginAt(joystick, 12, 0);
    moveTo(joystick, 13, 90);

    expect(joystick.sector).toBe('right');
    expect(intents).toEqual(['right']);
  });
});
