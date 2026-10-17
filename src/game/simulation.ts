import {
  FIXED_STEP_SECONDS,
  MAX_CATCHUP_STEPS,
  MAX_FRAME_DELTA_SECONDS
} from './constants';

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
