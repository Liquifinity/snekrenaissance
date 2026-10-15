import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { SnakeRenderer } from '../../src/render/snake-renderer';

describe('SnakeRenderer high-score capacity', () => {
  it('grows instanced capacity instead of silently hiding body segments', () => {
    const scene = new THREE.Scene();
    const renderer = new SnakeRenderer(scene, 16);
    const bodyPositions = Array.from({ length: 5000 }, (_, index) => ({
      x: 0,
      y: 0,
      z: index * 0.42
    }));

    renderer.render({
      headWrapped: { x: 0, y: 0, z: 0 },
      bodyPositions
    });

    expect(renderer.renderedSegmentCount).toBe(5000);
    expect(renderer.capacity).toBeGreaterThanOrEqual(5000);
    renderer.dispose();
  });
});
