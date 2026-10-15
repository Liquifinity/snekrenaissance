import { neutralInput, type InputState } from './input-state';

export class JoystickInput {
  private current: InputState = neutralInput();
  private pointerId: number | null = null;
  private centerX = 0;
  private centerY = 0;
  private radius = 1;

  get state(): InputState {
    return { ...this.current };
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
    let yaw = (x - this.centerX) / this.radius;
    let pitch = -(y - this.centerY) / this.radius;
    const magnitude = Math.hypot(yaw, pitch);

    if (magnitude > 1) {
      yaw /= magnitude;
      pitch /= magnitude;
    }

    this.current = { yaw, pitch };
  }
}
