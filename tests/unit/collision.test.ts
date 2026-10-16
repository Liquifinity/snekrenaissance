import { describe, expect, it } from 'vitest';
import { SELF_COLLISION_EXCLUSION_SEGMENTS } from '../../src/game/constants';
import { isSelfCollision } from '../../src/game/collision';

function distantBody(length: number) {
  return Array.from({ length }, (_, index) => ({ x: 0, y: 4, z: index + 2 }));
}

describe('toroidal self collision', () => {
  it('ignores body segments immediately behind the head', () => {
    const body = distantBody(SELF_COLLISION_EXCLUSION_SEGMENTS + 2);
    body[0] = { x: 0, y: 0, z: 0 };

    expect(isSelfCollision({ x: 0, y: 0, z: 0 }, body)).toBe(false);
  });

  it('collides with a later body segment inside the compact collision radius', () => {
    const body = distantBody(SELF_COLLISION_EXCLUSION_SEGMENTS + 2);
    body[SELF_COLLISION_EXCLUSION_SEGMENTS] = { x: 0.08, y: 0, z: 0 };

    expect(isSelfCollision({ x: 0, y: 0, z: 0 }, body)).toBe(true);
  });

  it('detects compact collision through opposite cube faces', () => {
    const body = distantBody(SELF_COLLISION_EXCLUSION_SEGMENTS + 2);
    body[SELF_COLLISION_EXCLUSION_SEGMENTS] = { x: -7.96, y: 0, z: 0 };

    expect(isSelfCollision({ x: 7.96, y: 0, z: 0 }, body)).toBe(true);
  });

  it('does not collide when paths only appear to cross but are separated in depth', () => {
    const body = distantBody(SELF_COLLISION_EXCLUSION_SEGMENTS + 2);
    body[SELF_COLLISION_EXCLUSION_SEGMENTS] = { x: 0, y: 0, z: 1.5 };

    expect(isSelfCollision({ x: 0, y: 0, z: 0 }, body)).toBe(false);
  });
});
