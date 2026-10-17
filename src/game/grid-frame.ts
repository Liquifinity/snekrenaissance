import type { GridDirection, GridFrame, TurnIntent } from './grid-types';
import { directionVector } from './grid-topology';

export const INITIAL_GRID_FRAME: GridFrame = Object.freeze({
  forward: '+Z',
  right: '-X',
  up: '+Y'
});

const OPPOSITE: Readonly<Record<GridDirection, GridDirection>> = Object.freeze({
  '+X': '-X',
  '-X': '+X',
  '+Y': '-Y',
  '-Y': '+Y',
  '+Z': '-Z',
  '-Z': '+Z'
});

function negate(direction: GridDirection): GridDirection {
  return OPPOSITE[direction];
}

export function rotateGridFrame(frame: GridFrame, intent: TurnIntent): GridFrame {
  const { forward: f, right: r, up: u } = frame;

  switch (intent) {
    case 'left':
      return { forward: negate(r), right: f, up: u };
    case 'right':
      return { forward: r, right: negate(f), up: u };
    case 'up':
      return { forward: u, right: r, up: negate(f) };
    case 'down':
      return { forward: negate(u), right: r, up: f };
    case 'none':
      return frame;
  }
}

export function isValidGridFrame(frame: GridFrame): boolean {
  const forward = directionVector(frame.forward);
  const right = directionVector(frame.right);
  const up = directionVector(frame.up);

  const forwardUpDot = forward.x * up.x + forward.y * up.y + forward.z * up.z;
  const expectedRight = {
    x: forward.y * up.z - forward.z * up.y,
    y: forward.z * up.x - forward.x * up.z,
    z: forward.x * up.y - forward.y * up.x
  };

  return forwardUpDot === 0
    && right.x === expectedRight.x
    && right.y === expectedRight.y
    && right.z === expectedRight.z;
}
