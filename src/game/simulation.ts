import {
  FIXED_STEP_SECONDS,
  MAX_CATCHUP_STEPS,
  MAX_FRAME_DELTA_SECONDS,
  SNAKE_SPEED,
  WORLD_SIZE
} from './constants';
import { forwardVector, type OrientationState } from './steering';
import { wrapVec3 } from './torus';
import type { Vec3 } from './types';

export type HeadMotion = {
  unwrappedPosition: Vec3;
  wrappedPosition: Vec3;
  forward: Vec3;
  wrapOffset: Vec3;
};

export function advanceHead(
  unwrappedPosition: Vec3,
  orientation: OrientationState,
  dt: number,
  speed = SNAKE_SPEED,
  worldSize = WORLD_SIZE
): HeadMotion {
  if (!Number.isFinite(dt) || dt < 0) {
    throw new RangeError('Motion dt must be a finite non-negative number.');
  }
  if (!Number.isFinite(speed) || speed < 0) {
    throw new RangeError('Snake speed must be a finite non-negative number.');
  }

  const forward = forwardVector(orientation);
  const distance = speed * dt;
  const nextUnwrapped = {
    x: unwrappedPosition.x + forward.x * distance,
    y: unwrappedPosition.y + forward.y * distance,
    z: unwrappedPosition.z + forward.z * distance
  };
  const wrappedPosition = wrapVec3(nextUnwrapped, worldSize);

  return {
    unwrappedPosition: nextUnwrapped,
    wrappedPosition,
    forward,
    wrapOffset: {
      x: wrappedPosition.x - nextUnwrapped.x,
      y: wrappedPosition.y - nextUnwrapped.y,
      z: wrappedPosition.z - nextUnwrapped.z
    }
  };
}

export class FixedStepClock {
  private accumulator = 0;

  constructor(
    readonly stepSeconds = FIXED_STEP_SECONDS,
    readonly maxFrameDeltaSeconds = MAX_FRAME_DELTA_SECONDS,
    readonly maxCatchupSteps = MAX_CATCHUP_STEPS
  ) {
    if (!(stepSeconds > 0) || !Number.isFinite(stepSeconds)) {
      throw new RangeError('Fixed step must be a finite positive number.');
    }
    if (!(maxFrameDeltaSeconds > 0) || !Number.isFinite(maxFrameDeltaSeconds)) {
      throw new RangeError('Maximum frame delta must be a finite positive number.');
    }
    if (!Number.isInteger(maxCatchupSteps) || maxCatchupSteps < 1) {
      throw new RangeError('Maximum catch-up steps must be a positive integer.');
    }
  }

  consume(frameDeltaSeconds: number, step: (dt: number) => void): number {
    const safeFrameDelta = Number.isFinite(frameDeltaSeconds)
      ? Math.min(this.maxFrameDeltaSeconds, Math.max(0, frameDeltaSeconds))
      : 0;

    const maxAccumulator = this.stepSeconds * this.maxCatchupSteps;
    this.accumulator = Math.min(maxAccumulator, this.accumulator + safeFrameDelta);

    let steps = 0;
    while (
      steps < this.maxCatchupSteps &&
      this.accumulator + Number.EPSILON >= this.stepSeconds
    ) {
      step(this.stepSeconds);
      this.accumulator -= this.stepSeconds;
      steps += 1;
    }

    if (Math.abs(this.accumulator) < Number.EPSILON) {
      this.accumulator = 0;
    }

    return steps;
  }

  reset(): void {
    this.accumulator = 0;
  }
}
