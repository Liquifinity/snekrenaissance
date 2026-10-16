import { describe, expect, it } from 'vitest';
import {
  CAMERA_DISTANCE,
  CAMERA_HEIGHT,
  CAMERA_LOOK_AHEAD,
  ChaseCameraController
} from '../../src/render/chase-camera';

const forwardZ = { x: 0, y: 0, z: 1 };
const zeroOffset = { x: 0, y: 0, z: 0 };

describe('wrap-aware chase camera', () => {
  it('uses a closer framing tuned for the compact snake scale', () => {
    expect(CAMERA_DISTANCE).toBe(2.6);
    expect(CAMERA_HEIGHT).toBe(0.75);
    expect(CAMERA_LOOK_AHEAD).toBe(0.4);
  });

  it('stays behind and slightly above the head', () => {
    const controller = new ChaseCameraController();
    const pose = controller.update({
      headWrapped: { x: 0, y: 0, z: 0 },
      forward: forwardZ,
      wrapOffset: zeroOffset
    }, 1 / 60);

    expect(pose.position.z).toBeLessThan(0);
    expect(pose.position.y).toBeGreaterThan(0);
    expect(pose.target.z).toBeGreaterThanOrEqual(0);
  });

  it('caps vertical camera displacement for steep climbs and dives', () => {
    for (const forward of [
      { x: 0, y: 1, z: 0 },
      { x: 0, y: -1, z: 0 }
    ]) {
      const controller = new ChaseCameraController();
      const head = { x: 0, y: 2, z: 0 };
      const pose = controller.update({
        headWrapped: head,
        forward,
        wrapOffset: zeroOffset
      }, 1 / 60);

      expect(Math.abs(pose.position.y - head.y)).toBeLessThanOrEqual(1.1);
    }
  });

  it('smoothly converges toward a moved head without overshooting', () => {
    const controller = new ChaseCameraController();
    controller.update({
      headWrapped: { x: 0, y: 0, z: 0 },
      forward: forwardZ,
      wrapOffset: zeroOffset
    }, 1 / 60);

    const first = controller.update({
      headWrapped: { x: 4, y: 0, z: 0 },
      forward: forwardZ,
      wrapOffset: zeroOffset
    }, 1 / 60);
    const second = controller.update({
      headWrapped: { x: 4, y: 0, z: 0 },
      forward: forwardZ,
      wrapOffset: zeroOffset
    }, 1 / 60);

    expect(first.position.x).toBeGreaterThan(0);
    expect(first.position.x).toBeLessThan(4);
    expect(second.position.x).toBeGreaterThan(first.position.x);
    expect(second.position.x).toBeLessThan(4);
  });

  it('relocates with +X to -X wrap instead of interpolating through the cube', () => {
    const controller = new ChaseCameraController();
    controller.update({
      headWrapped: { x: 7.9, y: 0, z: 0 },
      forward: { x: 1, y: 0, z: 0 },
      wrapOffset: zeroOffset
    }, 1 / 60);

    const pose = controller.update({
      headWrapped: { x: -7.9, y: 0, z: 0 },
      forward: { x: 1, y: 0, z: 0 },
      wrapOffset: { x: -16, y: 0, z: 0 }
    }, 1 / 60);

    expect(pose.position.x).toBeLessThan(-10);
  });

  it('relocates coherently on Y wrap', () => {
    const controller = new ChaseCameraController();
    controller.update({
      headWrapped: { x: 0, y: 7.9, z: 0 },
      forward: { x: 0, y: 1, z: 0 },
      wrapOffset: zeroOffset
    }, 1 / 60);

    const pose = controller.update({
      headWrapped: { x: 0, y: -7.9, z: 0 },
      forward: { x: 0, y: 1, z: 0 },
      wrapOffset: { x: 0, y: -16, z: 0 }
    }, 1 / 60);

    expect(pose.position.y).toBeLessThan(-9);
  });

  it('relocates coherently on Z wrap', () => {
    const controller = new ChaseCameraController();
    controller.update({
      headWrapped: { x: 0, y: 0, z: 7.9 },
      forward: forwardZ,
      wrapOffset: zeroOffset
    }, 1 / 60);

    const pose = controller.update({
      headWrapped: { x: 0, y: 0, z: -7.9 },
      forward: forwardZ,
      wrapOffset: { x: 0, y: 0, z: -16 }
    }, 1 / 60);

    expect(pose.position.z).toBeLessThan(-10);
  });
});
