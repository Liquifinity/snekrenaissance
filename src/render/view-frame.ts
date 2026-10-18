import { oppositeGridDirection } from '../game/grid-direction';
import type { GridDirection } from '../game/grid-types';
import type { Vec3 } from '../game/types';

export type ViewCommand = 'up' | 'down' | 'left' | 'right' | 'towardViewer' | 'intoScreen';

export type CameraBasis = Readonly<{
  intoScreen: Vec3;
  up: Vec3;
  right: Vec3;
}>;

export type ViewFrame = Readonly<{
  up: GridDirection;
  right: GridDirection;
  intoScreen: GridDirection;
}>;

export const VIEW_FRAME_SWITCH_MARGIN = 0.15;

export const INITIAL_VIEW_FRAME: ViewFrame = Object.freeze({
  up: '+Y',
  right: '+X',
  intoScreen: '-Z'
});

const DIRECTIONS: readonly GridDirection[] = Object.freeze([
  '+X', '-X', '+Y', '-Y', '+Z', '-Z'
]);

const VECTORS: Readonly<Record<GridDirection, Vec3>> = Object.freeze({
  '+X': Object.freeze({ x: 1, y: 0, z: 0 }),
  '-X': Object.freeze({ x: -1, y: 0, z: 0 }),
  '+Y': Object.freeze({ x: 0, y: 1, z: 0 }),
  '-Y': Object.freeze({ x: 0, y: -1, z: 0 }),
  '+Z': Object.freeze({ x: 0, y: 0, z: 1 }),
  '-Z': Object.freeze({ x: 0, y: 0, z: -1 })
});

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  };
}

function directionForVector(vector: Vec3): GridDirection {
  for (const direction of DIRECTIONS) {
    const candidate = VECTORS[direction];
    if (candidate.x === vector.x && candidate.y === vector.y && candidate.z === vector.z) {
      return direction;
    }
  }
  throw new RangeError('Vector is not a signed Cartesian grid direction.');
}

function frameScore(basis: CameraBasis, frame: ViewFrame): number {
  return dot(basis.intoScreen, VECTORS[frame.intoScreen])
    + dot(basis.up, VECTORS[frame.up])
    + dot(basis.right, VECTORS[frame.right]);
}

const VIEW_FRAMES: readonly ViewFrame[] = Object.freeze(
  DIRECTIONS.flatMap((intoScreen) => DIRECTIONS
    .filter((up) => dot(VECTORS[intoScreen], VECTORS[up]) === 0)
    .map((up) => Object.freeze({
      up,
      intoScreen,
      right: directionForVector(cross(VECTORS[intoScreen], VECTORS[up]))
    })))
);

export function enumerateViewFrames(): readonly ViewFrame[] {
  return VIEW_FRAMES;
}

export function selectViewFrame(basis: CameraBasis, current: ViewFrame): ViewFrame {
  let challenger = current;
  let challengerScore = frameScore(basis, current);

  for (const frame of VIEW_FRAMES) {
    const score = frameScore(basis, frame);
    if (score > challengerScore) {
      challenger = frame;
      challengerScore = score;
    }
  }

  const currentScore = frameScore(basis, current);
  return challengerScore > currentScore + VIEW_FRAME_SWITCH_MARGIN
    ? challenger
    : current;
}

export function mapViewCommand(frame: ViewFrame, command: ViewCommand): GridDirection {
  switch (command) {
    case 'up':
      return frame.up;
    case 'down':
      return oppositeGridDirection(frame.up);
    case 'right':
      return frame.right;
    case 'left':
      return oppositeGridDirection(frame.right);
    case 'intoScreen':
      return frame.intoScreen;
    case 'towardViewer':
      return oppositeGridDirection(frame.intoScreen);
  }
}
