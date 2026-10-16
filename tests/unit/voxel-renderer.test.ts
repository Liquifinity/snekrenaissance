import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { InterpolatedSegment } from '../../src/render/interpolation';
import {
  DEFAULT_RENDER_CAPACITY,
  SnakeRenderer
} from '../../src/render/snake-renderer';
import { FoodRenderer } from '../../src/render/food-renderer';

function interpolated(id: number, x: number, y = 0, z = 0): InterpolatedSegment {
  return {
    id,
    position: { x, y, z },
    born: false,
    birthAlpha: 1,
    displayWrapOffset: { x: 0, y: 0, z: 0 },
    duplicatePosition: null
  };
}

const identityFrame = {
  forward: { x: 0, y: 0, z: 1 },
  right: { x: -1, y: 0, z: 0 },
  up: { x: 0, y: 1, z: 0 },
  quaternion: { x: 0, y: 0, z: 0, w: 1 }
} as const;

describe('voxel SnakeRenderer', () => {
  it('uses instanced BoxGeometry for the body and a box head', () => {
    const scene = new THREE.Scene();
    const renderer = new SnakeRenderer(scene);
    const instanced = scene.children.find((child): child is THREE.InstancedMesh => child instanceof THREE.InstancedMesh);
    const head = scene.getObjectByName('snake-head') as THREE.Mesh | undefined;

    expect(instanced).toBeDefined();
    expect(instanced?.geometry).toBeInstanceOf(THREE.BoxGeometry);
    expect(head).toBeDefined();
    expect(head?.geometry).toBeInstanceOf(THREE.BoxGeometry);
    renderer.dispose();
  });

  it('renders exactly the supplied logical body count and grows capacity without hiding voxels', () => {
    const scene = new THREE.Scene();
    const renderer = new SnakeRenderer(scene, 2);
    const body = Array.from({ length: DEFAULT_RENDER_CAPACITY + 10 }, (_, index) => interpolated(index + 1, index * 0.1));

    renderer.render({
      head: interpolated(0, 0),
      body,
      frame: identityFrame
    });

    expect(renderer.renderedSegmentCount).toBe(body.length);
    expect(renderer.capacity).toBeGreaterThanOrEqual(body.length);
    renderer.dispose();
  });

  it('keeps two pixel-style eyes attached to the voxel head and follows presentation quaternion', () => {
    const scene = new THREE.Scene();
    const renderer = new SnakeRenderer(scene);
    renderer.render({
      head: interpolated(0, 1, 2, 3),
      body: [],
      frame: {
        ...identityFrame,
        quaternion: { x: 0, y: Math.SQRT1_2, z: 0, w: Math.SQRT1_2 }
      }
    });

    const head = scene.getObjectByName('snake-head') as THREE.Mesh;
    expect(scene.getObjectByName('snake-eye-left')).toBeDefined();
    expect(scene.getObjectByName('snake-eye-right')).toBeDefined();
    expect(head.position.toArray()).toEqual([1, 2, 3]);
    expect(head.quaternion.y).toBeCloseTo(Math.SQRT1_2, 8);
    renderer.dispose();
  });
});

describe('voxel FoodRenderer', () => {
  it('uses BoxGeometry and places presentation-space food without logical conversion', () => {
    const scene = new THREE.Scene();
    const renderer = new FoodRenderer(scene);
    renderer.render({ x: 0.4, y: -0.8, z: 1.2 });

    const mesh = scene.getObjectByName('food-voxel') as THREE.Mesh | undefined;
    expect(mesh).toBeDefined();
    expect(mesh?.geometry).toBeInstanceOf(THREE.BoxGeometry);
    expect(mesh?.position.toArray()).toEqual([0.4, -0.8, 1.2]);
    renderer.dispose();
  });
});
