// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BoardOrbitPort } from '../../src/render/board-orbit';
import { attachBoardOrbit, BOARD_ORBIT_RADIANS_PER_PIXEL } from '../../src/render/board-orbit';

function pointerEvent(
  type: string,
  init: Readonly<{
    pointerId: number;
    pointerType: 'mouse' | 'touch';
    button?: number;
    clientX: number;
    clientY: number;
  }>
): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  for (const [key, value] of Object.entries({ button: 0, ...init })) {
    Object.defineProperty(event, key, { configurable: true, value });
  }
  return event;
}

function createCamera(): BoardOrbitPort & {
  orbitBy: ReturnType<typeof vi.fn>;
  setZoomFactor: ReturnType<typeof vi.fn>;
} {
  return {
    zoomFactor: 1,
    orbitBy: vi.fn(),
    setZoomFactor: vi.fn()
  };
}

describe('SNEK CORE V5 board orbit gestures', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('uses exactly 0.005 radians per pointer pixel', () => {
    expect(BOARD_ORBIT_RADIANS_PER_PIXEL).toBe(0.005);
  });

  it('maps primary mouse drag so the cube follows both drag axes and stops completely on release', () => {
    const target = document.createElement('div');
    const camera = createCamera();
    const onChange = vi.fn();
    const detach = attachBoardOrbit(target, camera, onChange);

    target.dispatchEvent(pointerEvent('pointerdown', {
      pointerId: 1, pointerType: 'mouse', button: 0, clientX: 100, clientY: 100
    }));
    target.dispatchEvent(pointerEvent('pointermove', {
      pointerId: 1, pointerType: 'mouse', clientX: 120, clientY: 130
    }));

    expect(camera.orbitBy).toHaveBeenCalledTimes(1);
    expect(camera.orbitBy).toHaveBeenLastCalledWith(-0.1, -0.15);
    expect(onChange).toHaveBeenCalledTimes(1);

    target.dispatchEvent(pointerEvent('pointerup', {
      pointerId: 1, pointerType: 'mouse', clientX: 120, clientY: 130
    }));
    target.dispatchEvent(pointerEvent('pointermove', {
      pointerId: 1, pointerType: 'mouse', clientX: 200, clientY: 200
    }));

    expect(camera.orbitBy).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledTimes(1);
    detach();
  });

  it('ignores non-primary mouse buttons', () => {
    const target = document.createElement('div');
    const camera = createCamera();
    const detach = attachBoardOrbit(target, camera, vi.fn());

    target.dispatchEvent(pointerEvent('pointerdown', {
      pointerId: 2, pointerType: 'mouse', button: 1, clientX: 0, clientY: 0
    }));
    target.dispatchEvent(pointerEvent('pointermove', {
      pointerId: 2, pointerType: 'mouse', clientX: 100, clientY: 100
    }));

    expect(camera.orbitBy).not.toHaveBeenCalled();
    detach();
  });

  it('orbits with one touch using the same drag direction, pauses orbit for two-touch pinch, and uses the pinch baseline', () => {
    const target = document.createElement('div');
    const camera = createCamera();
    const onChange = vi.fn();
    const detach = attachBoardOrbit(target, camera, onChange);

    target.dispatchEvent(pointerEvent('pointerdown', {
      pointerId: 10, pointerType: 'touch', clientX: 0, clientY: 0
    }));
    target.dispatchEvent(pointerEvent('pointermove', {
      pointerId: 10, pointerType: 'touch', clientX: 10, clientY: 20
    }));
    expect(camera.orbitBy).toHaveBeenLastCalledWith(-0.05, -0.1);

    camera.orbitBy.mockClear();
    onChange.mockClear();
    target.dispatchEvent(pointerEvent('pointerdown', {
      pointerId: 11, pointerType: 'touch', clientX: 110, clientY: 20
    }));
    target.dispatchEvent(pointerEvent('pointermove', {
      pointerId: 11, pointerType: 'touch', clientX: 210, clientY: 20
    }));

    expect(camera.orbitBy).not.toHaveBeenCalled();
    expect(camera.setZoomFactor).toHaveBeenCalledWith(2);
    expect(onChange).toHaveBeenCalledTimes(1);
    detach();
  });

  it('rebases the remaining touch after pinch so returning to orbit cannot jump', () => {
    const target = document.createElement('div');
    const camera = createCamera();
    const detach = attachBoardOrbit(target, camera, vi.fn());

    target.dispatchEvent(pointerEvent('pointerdown', {
      pointerId: 20, pointerType: 'touch', clientX: 0, clientY: 0
    }));
    target.dispatchEvent(pointerEvent('pointerdown', {
      pointerId: 21, pointerType: 'touch', clientX: 100, clientY: 0
    }));
    target.dispatchEvent(pointerEvent('pointermove', {
      pointerId: 20, pointerType: 'touch', clientX: 40, clientY: 30
    }));
    target.dispatchEvent(pointerEvent('pointerup', {
      pointerId: 21, pointerType: 'touch', clientX: 100, clientY: 0
    }));

    camera.orbitBy.mockClear();
    target.dispatchEvent(pointerEvent('pointermove', {
      pointerId: 20, pointerType: 'touch', clientX: 42, clientY: 31
    }));

    expect(camera.orbitBy).toHaveBeenCalledTimes(1);
    expect(camera.orbitBy).toHaveBeenCalledWith(-0.01, -0.005);
    detach();
  });

  it('detaches every listener without scheduling residual motion', () => {
    const target = document.createElement('div');
    const camera = createCamera();
    const onChange = vi.fn();
    const detach = attachBoardOrbit(target, camera, onChange);
    detach();

    target.dispatchEvent(pointerEvent('pointerdown', {
      pointerId: 30, pointerType: 'mouse', clientX: 0, clientY: 0
    }));
    target.dispatchEvent(pointerEvent('pointermove', {
      pointerId: 30, pointerType: 'mouse', clientX: 50, clientY: 50
    }));

    expect(camera.orbitBy).not.toHaveBeenCalled();
    expect(camera.setZoomFactor).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });
});
