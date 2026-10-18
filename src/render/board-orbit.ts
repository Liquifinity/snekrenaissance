import type { BoardCameraController } from './board-camera';

export const BOARD_ORBIT_RADIANS_PER_PIXEL = 0.005;

export type BoardOrbitPort = Pick<
  BoardCameraController,
  'zoomFactor' | 'orbitBy' | 'setZoomFactor'
>;

type Point = Readonly<{ x: number; y: number }>;
type MouseDrag = Readonly<{ pointerId: number; point: Point }>;

function distanceBetween(points: ReadonlyMap<number, Point>): number | null {
  if (points.size !== 2) return null;
  const [first, second] = [...points.values()];
  if (!first || !second) return null;
  const distance = Math.hypot(second.x - first.x, second.y - first.y);
  return Number.isFinite(distance) && distance > 0 ? distance : null;
}

export function attachBoardOrbit(
  target: HTMLElement,
  camera: BoardOrbitPort,
  onChange: () => void
): () => void {
  let mouseDrag: MouseDrag | null = null;
  const touches = new Map<number, Point>();
  let pinchStartDistance: number | null = null;
  let pinchStartZoom = camera.zoomFactor;

  const capture = (pointerId: number) => {
    try {
      target.setPointerCapture?.(pointerId);
    } catch {
      // Pointer capture is an enhancement; tracked pointer state remains authoritative.
    }
  };

  const release = (pointerId: number) => {
    try {
      if (target.hasPointerCapture?.(pointerId)) target.releasePointerCapture(pointerId);
    } catch {
      // Ignore browsers/environments without active capture.
    }
  };

  const restartPinch = () => {
    pinchStartDistance = distanceBetween(touches);
    pinchStartZoom = camera.zoomFactor;
  };

  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType === 'mouse') {
      if (event.button !== 0) return;
      mouseDrag = {
        pointerId: event.pointerId,
        point: { x: event.clientX, y: event.clientY }
      };
      capture(event.pointerId);
      event.preventDefault();
      return;
    }

    if (event.pointerType !== 'touch') return;
    touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    capture(event.pointerId);
    if (touches.size === 2) restartPinch();
    else if (touches.size > 2) pinchStartDistance = null;
    event.preventDefault();
  };

  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType === 'mouse') {
      if (!mouseDrag || mouseDrag.pointerId !== event.pointerId) return;
      const dx = event.clientX - mouseDrag.point.x;
      const dy = event.clientY - mouseDrag.point.y;
      mouseDrag = {
        pointerId: event.pointerId,
        point: { x: event.clientX, y: event.clientY }
      };
      if (dx !== 0 || dy !== 0) {
        camera.orbitBy(
          -dx * BOARD_ORBIT_RADIANS_PER_PIXEL,
          dy * BOARD_ORBIT_RADIANS_PER_PIXEL
        );
        onChange();
      }
      event.preventDefault();
      return;
    }

    if (event.pointerType !== 'touch') return;
    const previous = touches.get(event.pointerId);
    if (!previous) return;

    const current = { x: event.clientX, y: event.clientY };
    touches.set(event.pointerId, current);

    if (touches.size === 1) {
      const dx = current.x - previous.x;
      const dy = current.y - previous.y;
      if (dx !== 0 || dy !== 0) {
        camera.orbitBy(
          -dx * BOARD_ORBIT_RADIANS_PER_PIXEL,
          dy * BOARD_ORBIT_RADIANS_PER_PIXEL
        );
        onChange();
      }
    } else if (touches.size === 2 && pinchStartDistance !== null) {
      const currentDistance = distanceBetween(touches);
      if (currentDistance !== null) {
        camera.setZoomFactor(pinchStartZoom * (currentDistance / pinchStartDistance));
        onChange();
      }
    }

    event.preventDefault();
  };

  const endPointer = (event: PointerEvent) => {
    if (event.pointerType === 'mouse') {
      if (mouseDrag?.pointerId === event.pointerId) mouseDrag = null;
      release(event.pointerId);
      return;
    }

    if (event.pointerType !== 'touch' || !touches.delete(event.pointerId)) return;
    release(event.pointerId);
    if (touches.size === 2) restartPinch();
    else {
      pinchStartDistance = null;
      if (touches.size === 1) pinchStartZoom = camera.zoomFactor;
    }
  };

  target.addEventListener('pointerdown', onPointerDown);
  target.addEventListener('pointermove', onPointerMove);
  target.addEventListener('pointerup', endPointer);
  target.addEventListener('pointercancel', endPointer);

  return () => {
    target.removeEventListener('pointerdown', onPointerDown);
    target.removeEventListener('pointermove', onPointerMove);
    target.removeEventListener('pointerup', endPointer);
    target.removeEventListener('pointercancel', endPointer);
    mouseDrag = null;
    touches.clear();
    pinchStartDistance = null;
  };
}
