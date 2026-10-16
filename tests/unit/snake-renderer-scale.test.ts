import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { SnakeRenderer } from '../../src/render/snake-renderer';

describe('SnakeRenderer', () => {
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
      bodyPositions,
      forward: { x: 0, y: 0, z: 1 },
      up: { x: 0, y: 1, z: 0 }
    });

    expect(renderer.renderedSegmentCount).toBe(5000);
    expect(renderer.capacity).toBeGreaterThanOrEqual(5000);
    renderer.dispose();
  });

  it('renders two black eyes attached to the snake head', () => {
    const scene = new THREE.Scene();
    const renderer = new SnakeRenderer(scene);

    renderer.render({
      headWrapped: { x: 0, y: 0, z: 0 },
      bodyPositions: [],
      forward: { x: 0, y: 0, z: 1 },
      up: { x: 0, y: 1, z: 0 }
    });

    expect(scene.getObjectByName('snake-eye-left')).toBeDefined();
    expect(scene.getObjectByName('snake-eye-right')).toBeDefined();
    renderer.dispose();
  });
});
