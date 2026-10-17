import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RENDER_CAPACITY,
  SNAKE_VOXEL_SIZE,
  SnakeRenderer,
  type VoxelBodySample
} from '../../src/render/snake-renderer';
import {
  FOOD_VOXEL_SIZE,
  FoodRenderer
} from '../../src/render/food-renderer';

function body(id: number, x: number, y = 0, z = 0): VoxelBodySample {
  return { id, position: { x, y, z } };
}

function matrixPosition(mesh: THREE.InstancedMesh, index: number): THREE.Vector3 {
  const matrix = new THREE.Matrix4();
  mesh.getMatrixAt(index, matrix);
  return new THREE.Vector3().setFromMatrixPosition(matrix);
}

describe('continuous voxel SnakeRenderer', () => {
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

  it('renders the exact continuous head position and quaternion', () => {
    const scene = new THREE.Scene();
    const renderer = new SnakeRenderer(scene);
    renderer.render({
      headPosition: { x: 1.25, y: -0.5, z: 0.75 },
      headQuaternion: { x: 0, y: Math.SQRT1_2, z: 0, w: Math.SQRT1_2 },
      body: []
    });

    const head = scene.getObjectByName('snake-head') as THREE.Mesh;
    expect(head.position.toArray()).toEqual([1.25, -0.5, 0.75]);
    expect(head.quaternion.y).toBeCloseTo(Math.SQRT1_2, 8);
    expect(head.quaternion.w).toBeCloseTo(Math.SQRT1_2, 8);
    expect(scene.getObjectByName('snake-eye-left')).toBeDefined();
    expect(scene.getObjectByName('snake-eye-right')).toBeDefined();
    renderer.dispose();
  });

  it('maps body samples to matrices in strategic ID order', () => {
    const scene = new THREE.Scene();
    const renderer = new SnakeRenderer(scene);
    const samples = [body(7, 0.1), body(9, 0.2), body(13, 0.3)];
    renderer.render({
      headPosition: { x: 0, y: 0, z: 0 },
      headQuaternion: { x: 0, y: 0, z: 0, w: 1 },
      body: samples
    });

    const mesh = scene.getObjectByName('snake-body-voxels') as THREE.InstancedMesh;
    expect(renderer.renderedSegmentCount).toBe(3);
    expect(matrixPosition(mesh, 0).x).toBeCloseTo(0.1, 12);
    expect(matrixPosition(mesh, 1).x).toBeCloseTo(0.2, 12);
    expect(matrixPosition(mesh, 2).x).toBeCloseTo(0.3, 12);
    renderer.dispose();
  });

  it('preserves existing visual order when a new strategic tail ID is appended', () => {
    const scene = new THREE.Scene();
    const renderer = new SnakeRenderer(scene);
    const head = { headPosition: { x: 0, y: 0, z: 0 }, headQuaternion: { x: 0, y: 0, z: 0, w: 1 } } as const;

    renderer.render({ ...head, body: [body(1, 1), body(2, 2)] });
    renderer.render({ ...head, body: [body(1, 1.1), body(2, 2.1), body(8, 3)] });

    const mesh = scene.getObjectByName('snake-body-voxels') as THREE.InstancedMesh;
    expect(matrixPosition(mesh, 0).x).toBeCloseTo(1.1, 12);
    expect(matrixPosition(mesh, 1).x).toBeCloseTo(2.1, 12);
    expect(matrixPosition(mesh, 2).x).toBeCloseTo(3, 12);
    renderer.dispose();
  });

  it('grows capacity without hiding supplied body samples', () => {
    const scene = new THREE.Scene();
    const renderer = new SnakeRenderer(scene, 2);
    const samples = Array.from({ length: DEFAULT_RENDER_CAPACITY + 10 }, (_, index) => body(index + 1, index * 0.1));

    renderer.render({
      headPosition: { x: 0, y: 0, z: 0 },
      headQuaternion: { x: 0, y: 0, z: 0, w: 1 },
      body: samples
    });

    expect(renderer.renderedSegmentCount).toBe(samples.length);
    expect(renderer.capacity).toBeGreaterThanOrEqual(samples.length);
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

  it('uses the same visual voxel size as the snake grid', () => {
    expect(FOOD_VOXEL_SIZE).toBe(SNAKE_VOXEL_SIZE);
  });
});
