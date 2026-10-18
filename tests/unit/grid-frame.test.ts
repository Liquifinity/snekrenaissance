import { describe, expect, it } from 'vitest';
import type { AxisVector, GridDirection, GridFrame, TurnIntent } from '../../src/game/grid-types';
import { INITIAL_GRID_FRAME, isValidGridFrame, rotateGridFrame } from '../../src/game/grid-frame';
import { directionVector } from '../../src/game/grid-topology';

const DIRECTIONS: GridDirection[] = ['+X', '-X', '+Y', '-Y', '+Z', '-Z'];
const TURNS: Exclude<TurnIntent, 'none'>[] = ['left', 'right', 'up', 'down'];

function canonicalAxis(value: number): -1 | 0 | 1 {
  return (value === 0 ? 0 : value) as -1 | 0 | 1;
}

function cross(a: AxisVector, b: AxisVector): AxisVector {
  return {
    x: canonicalAxis(a.y * b.z - a.z * b.y),
    y: canonicalAxis(a.z * b.x - a.x * b.z),
    z: canonicalAxis(a.x * b.y - a.y * b.x)
  };
}

function directionFromVector(vector: AxisVector): GridDirection {
  const match = DIRECTIONS.find((direction) => {
    const candidate = directionVector(direction);
    return candidate.x === vector.x && candidate.y === vector.y && candidate.z === vector.z;
  });
  if (!match) throw new Error(`No direction for ${JSON.stringify(vector)}`);
  return match;
}

function allValidFrames(): GridFrame[] {
  const frames: GridFrame[] = [];
  for (const forward of DIRECTIONS) {
    for (const up of DIRECTIONS) {
      const f = directionVector(forward);
      const u = directionVector(up);
      const dot = f.x * u.x + f.y * u.y + f.z * u.z;
      if (dot !== 0) continue;
      const right = directionFromVector(cross(f, u));
      frames.push({ forward, right, up });
    }
  }
  return frames;
}

describe('GridFrame rotations', () => {
  it('uses the approved initial frame', () => {
    expect(INITIAL_GRID_FRAME).toEqual({ forward: '+Z', right: '-X', up: '+Y' });
  });

  it.each([
    ['left', { forward: '+X', right: '+Z', up: '+Y' }],
    ['right', { forward: '-X', right: '-Z', up: '+Y' }],
    ['up', { forward: '+Y', right: '-X', up: '-Z' }],
    ['down', { forward: '-Y', right: '-X', up: '+Z' }]
  ] as const)('applies the approved %s rotation', (intent, expected) => {
    expect(rotateGridFrame(INITIAL_GRID_FRAME, intent)).toEqual(expected);
  });

  it('leaves the frame unchanged for none', () => {
    expect(rotateGridFrame(INITIAL_GRID_FRAME, 'none')).toEqual(INITIAL_GRID_FRAME);
  });

  it('enumerates exactly 24 valid right-handed cardinal frames', () => {
    const frames = allValidFrames();
    expect(frames).toHaveLength(24);
    expect(frames.every(isValidGridFrame)).toBe(true);
  });

  it('preserves orthonormal handedness after every turn from every valid frame', () => {
    for (const frame of allValidFrames()) {
      for (const turn of TURNS) {
        const rotated = rotateGridFrame(frame, turn);
        expect(isValidGridFrame(rotated)).toBe(true);

        const expectedRight = cross(
          directionVector(rotated.forward),
          directionVector(rotated.up)
        );
        expect(directionVector(rotated.right)).toEqual(expectedRight);
        expect(rotated.forward).not.toBe(opposite(frame.forward));
      }
    }
  });

  it('makes left/right and up/down exact inverses', () => {
    for (const frame of allValidFrames()) {
      expect(rotateGridFrame(rotateGridFrame(frame, 'left'), 'right')).toEqual(frame);
      expect(rotateGridFrame(rotateGridFrame(frame, 'right'), 'left')).toEqual(frame);
      expect(rotateGridFrame(rotateGridFrame(frame, 'up'), 'down')).toEqual(frame);
      expect(rotateGridFrame(rotateGridFrame(frame, 'down'), 'up')).toEqual(frame);
    }
  });

  it.each(TURNS)('returns to the original frame after four %s quarter turns', (turn) => {
    for (const frame of allValidFrames()) {
      let rotated = frame;
      for (let i = 0; i < 4; i += 1) {
        rotated = rotateGridFrame(rotated, turn);
      }
      expect(rotated).toEqual(frame);
    }
  });
});

function opposite(direction: GridDirection): GridDirection {
  const map: Record<GridDirection, GridDirection> = {
    '+X': '-X', '-X': '+X',
    '+Y': '-Y', '-Y': '+Y',
    '+Z': '-Z', '-Z': '+Z'
  };
  return map[direction];
}
