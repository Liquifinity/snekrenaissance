import type { FixedStepClock } from '../game/simulation';

export type RuntimeLifecycleHooks = {
  resize: () => void;
  resetTouch: () => void;
  showError: (message: string) => void;
};

export class RuntimeLifecycle {
  private hidden = false;

  constructor(
    private readonly clock: FixedStepClock,
    private readonly hooks: RuntimeLifecycleHooks
  ) {}

  consumeFrame(frameDeltaSeconds: number, step: (dt: number) => void): number {
    if (this.hidden) return 0;
    return this.clock.consume(frameDeltaSeconds, step);
  }

  setHidden(hidden: boolean): void {
    this.hidden = hidden;
    this.clock.reset();
  }

  handleResize(): void {
    this.hooks.resetTouch();
    this.hooks.resize();
  }

  handleOrientationChange(): void {
    this.hooks.resetTouch();
    this.hooks.resize();
  }

  handleRendererError(_error: unknown): void {
    this.hooks.showError('3D renderer unavailable. Reload to try again.');
  }
}
