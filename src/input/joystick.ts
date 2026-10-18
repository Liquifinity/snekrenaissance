import type { TurnIntent } from '../game/grid-types';

export const JOYSTICK_DEADZONE = 0.15;
export const JOYSTICK_SECTOR_HYSTERESIS_DEGREES = 10;

export type JoystickSector = 'neutral' | 'left' | 'right' | 'up' | 'down';
export type JoystickVisualVector = Readonly<{ x: number; y: number }>;

type TurnEvent = Exclude<TurnIntent, 'none'>;

export type JoystickInputOptions = {
  onTurnIntent?: (intent: TurnEvent) => void;
};

const SECTOR_CENTER_DEGREES: Readonly<Record<TurnEvent, number>> = Object.freeze({
  right: 0,
  up: 90,
  left: 180,
  down: -90
});

const DIAGONAL_TIE_EPSILON = 1e-12;

function normalizeAngleDegrees(angle: number): number {
  return ((angle + 180) % 360 + 360) % 360 - 180;
}

function angularDistanceDegrees(a: number, b: number): number {
  return Math.abs(normalizeAngleDegrees(a - b));
}

function nominalSector(x: number, y: number): TurnEvent {
  const absX = Math.abs(x);
  const absY = Math.abs(y);
  const horizontalWins = absX > absY || Math.abs(absX - absY) <= DIAGONAL_TIE_EPSILON;

  if (horizontalWins) return x >= 0 ? 'right' : 'left';
  return y >= 0 ? 'up' : 'down';
}

export class JoystickInput {
  private currentSector: JoystickSector = 'neutral';
  private currentVisual: JoystickVisualVector = Object.freeze({ x: 0, y: 0 });
  private pointerId: number | null = null;
  private centerX = 0;
  private centerY = 0;
  private radius = 1;
  private readonly onTurnIntent?: (intent: TurnEvent) => void;

  constructor(options: JoystickInputOptions = {}) {
    this.onTurnIntent = options.onTurnIntent;
  }

  get sector(): JoystickSector {
    return this.currentSector;
  }

  get visualVector(): JoystickVisualVector {
    return { ...this.currentVisual };
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
    this.currentSector = 'neutral';
    this.currentVisual = Object.freeze({ x: 0, y: 0 });
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
    let vectorX = (x - this.centerX) / this.radius;
    let vectorY = -(y - this.centerY) / this.radius;
    let magnitude = Math.hypot(vectorX, vectorY);

    if (magnitude > 1) {
      vectorX /= magnitude;
      vectorY /= magnitude;
      magnitude = 1;
    }

    this.currentVisual = Object.freeze({ x: vectorX, y: vectorY });

    if (magnitude <= JOYSTICK_DEADZONE) {
      this.currentSector = 'neutral';
      return;
    }

    const candidate = nominalSector(vectorX, vectorY);
    let nextSector: TurnEvent = candidate;

    if (this.currentSector !== 'neutral' && candidate !== this.currentSector) {
      const angle = Math.atan2(vectorY, vectorX) * 180 / Math.PI;
      const currentCenter = SECTOR_CENTER_DEGREES[this.currentSector];
      const keepCurrentThrough = 45 + JOYSTICK_SECTOR_HYSTERESIS_DEGREES;

      if (angularDistanceDegrees(angle, currentCenter) <= keepCurrentThrough) {
        nextSector = this.currentSector;
      }
    }

    if (nextSector === this.currentSector) return;

    this.currentSector = nextSector;
    this.onTurnIntent?.(nextSector);
  }
}
