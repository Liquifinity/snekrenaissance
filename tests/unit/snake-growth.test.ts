import { describe, expect, it } from 'vitest';
import { SEGMENT_SPACING } from '../../src/game/constants';
import { createSnakeState, growSnake, sampleBodyPositions } from '../../src/game/snake';
import { TrailBuffer } from '../../src/game/trail';

describe('snake growth', () => {
  it('starts with exactly 12 body segments', () => {
    expect(createSnakeState().segmentCount).toBe(12);
  });

  it('adds exactly four segments when grown by four', () => {
    const initial = createSnakeState();
    const grown = growSnake(initial, 4);
    expect(initial.segmentCount).toBe(12);
    expect(grown.segmentCount).toBe(16);
  });

  it('keeps fixed segment spacing after growth', () => {
    const trail = new TrailBuffer({ x: 0, y: 0, z: -20 });
    for (let z = -19.5; z <= 0; z += 0.5) {
      trail.push({ x: 0, y: 0, z });
    }

    const state = growSnake(createSnakeState(), 4);
    const body = sampleBodyPositions(state, trail);
    expect(body).toHaveLength(16);

    for (let i = 1; i < body.length; i += 1) {
      const distance = Math.hypot(
        body[i].x - body[i - 1].x,
        body[i].y - body[i - 1].y,
        body[i].z - body[i - 1].z
      );
      expect(distance).toBeCloseTo(SEGMENT_SPACING, 6);
    }
  });
});
