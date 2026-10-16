import { describe, expect, it } from 'vitest';
import { FOOD_PICKUP_RADIUS, WORLD_SIZE } from '../../src/game/constants';
import { OVERVIEW_CAMERA_POSITION } from '../../src/render/overview-camera';

describe('compact arena contract', () => {
  it('uses the approved half-size cube', () => {
    expect(WORLD_SIZE).toBe(4);
  });

  it('uses the approved larger invisible food pickup radius', () => {
    expect(FOOD_PICKUP_RADIUS).toBeCloseTo(0.3);
  });
});

describe('spectator overview camera', () => {
  it('sits centered directly in front of the cube', () => {
    expect(OVERVIEW_CAMERA_POSITION.x).toBe(0);
    expect(OVERVIEW_CAMERA_POSITION.y).toBe(0);
    expect(OVERVIEW_CAMERA_POSITION.z).toBeCloseTo(-WORLD_SIZE * 1.8);
  });
});
