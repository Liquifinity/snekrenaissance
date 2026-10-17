import type { TurnIntent } from '../game/grid-types';
import { neutralInput, type InputState } from './input-state';

export const JOYSTICK_ACTIVATION_THRESHOLD = 0.55;
export const JOYSTICK_REARM_THRESHOLD = 0.25;

export class JoystickInput {
  private current: InputState = neutralInput();
  private pendingIntent: TurnIntent = 'none';
  private armed = true;
  private pointerId: number | null = null;
  private centerX = 0;
  private centerY = 0;
  private radius = 1;

  /** Temporary V1 compatibility surface. V2 consumes takeIntent(). */
  get state(): InputState {
    return { ...this.current };
  }

  takeIntent(): TurnIntent {
    const intent = this.pendingIntent;
    this.pendingIntent = 'none';
    return intent;
  }

  get activePointerId(): number | null {
    return this.pointerId;
  }

  begin(
    pointerId: number,
    x: number,
    y: number,
    centerX: number,
    centerY: number,
    radius: number
  ): void {
    if (!Number.isFinite(radius) || radius <= 0) {
      throw new RangeError('Joystick radius must be a finite positive number.');
    }
    this.pointerId = pointerId;
    this.centerX = centerX;
    this.centerY = centerY;
    this.radius = radius;
    this.updateFromPoint(x, y);
  }

  move(pointerId: number, x: number, y: number): void {
    if (pointerId !== this.pointerId) return;
    this.updateFromPoint(x, y);
  }

  end(pointerId: number): void {
    if (pointerId !== this.pointerId) return;
    this.reset();
  }

  cancel(pointerId: number): void {
    if (pointerId !== this.pointerId) return;
    this.reset();
  }

  reset(): void {
    this.pointerId = null;
    this.current = neutralInput();
    this.pendingIntent = 'none';
    this.armed = true;
  }

  attach(element: HTMLElement, windowTarget: Window = window): () => void {
    const onPointerDown = (event: PointerEvent) => {
      if (this.pointerId !== null) return;
      const rect = element.getBoundingClientRect();
      const radius = Math.max(1, Math.min(rect.width, rect.height) / 2);
      this.begin(
        event.pointerId,
        event.clientX,
        event.clientY,
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
        radius
      );
      element.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    };
    const onPointerMove = (event: PointerEvent) => {
      this.move(event.pointerId, event.clientX, event.clientY);
      if (event.pointerId === this.pointerId) event.preventDefault();
    };
    const onPointerUp = (event: PointerEvent) => this.end(event.pointerId);
    const onPointerCancel = (event: PointerEvent) => this.cancel(event.pointerId);
    const onReset = () => this.reset();

    element.addEventListener('pointerdown', onPointerDown);
    element.addEventListener('pointermove', onPointerMove);
    element.addEventListener('pointerup', onPointerUp);
    element.addEventListener('pointercancel', onPointerCancel);
    windowTarget.addEventListener('resize', onReset);
    windowTarget.addEventListener('orientationchange', onReset);

    return () => {
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('pointermove', onPointerMove);
      element.removeEventListener('pointerup', onPointerUp);
      element.removeEventListener('pointercancel', onPointerCancel);
      windowTarget.removeEventListener('resize', onReset);
      windowTarget.removeEventListener('orientationchange', onReset);
      this.reset();
    };
  }

  private updateFromPoint(x: number, y: number): void {
    let yaw = -(x - this.centerX) / this.radius;
    let pitch = -(y - this.centerY) / this.radius;
    const magnitude = Math.hypot(yaw, pitch);

    if (magnitude > 1) {
      yaw /= magnitude;
      pitch /= magnitude;
    }

    // InputState is presentation-only in V2. Expose horizontal movement in
    // screen coordinates while preserving the existing logical yaw used
    // below to resolve discrete left/right TurnIntent values.
    this.current = { yaw: -yaw, pitch };
    this.updateDiscreteIntent(yaw, pitch);
  }

  private updateDiscreteIntent(yaw: number, pitch: number): void {
    const dominantMagnitude = Math.max(Math.abs(yaw), Math.abs(pitch));

    if (dominantMagnitude <= JOYSTICK_REARM_THRESHOLD) {
      this.armed = true;
      return;
    }

    if (!this.armed || this.pendingIntent !== 'none' || dominantMagnitude < JOYSTICK_ACTIVATION_THRESHOLD) {
      return;
    }

    if (Math.abs(yaw) >= Math.abs(pitch)) {
      this.pendingIntent = yaw >= 0 ? 'left' : 'right';
    } else {
      this.pendingIntent = pitch >= 0 ? 'up' : 'down';
    }

    this.armed = false;
  }
}
