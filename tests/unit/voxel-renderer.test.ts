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
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  mesh.getMatrixAt(index, matrix);
  matrix.decompose(position, quaternion, scale);
  return position;
}

describe('voxel SnakeRenderer V2.1', () => {
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

  it('renders continuous head position/quaternion directly', () => {
    const scene = new THREE.Scene();
    const renderer = new SnakeRenderer(scene);
    renderer.render({
      headPosition: { x: 1, y: 2, z: 3 },
      headQuaternion: { x: 0, y: Math.SQRT1_2, z: 0, w: Math.SQRT1_2 },
      body: []
    });

    const head = scene.getObjectByName('snake-head') as THREE.Mesh;
    expect(head.position.toArray()).toEqual([1, 2, 3]);
    expect(head.quaternion.y).toBeCloseTo(Math.SQRT1_2, 8);
    expect(scene.getObjectByName('snake-eye-left')).toBeDefined();
    expect(scene.getObjectByName('snake-eye-right')).toBeDefined();
    renderer.dispose();
  });

  it('maps body samples in strategic stable-ID order and grows capacity without hiding voxels', () => {
    const scene = new THREE.Scene();
    const renderer = new SnakeRenderer(scene, 2);
    const samples = Array.from(
      { length: DEFAULT_RENDER_CAPACITY + 10 },
      (_, index) => body(100 + index, index * 0.1, index * 0.01, 0)
    );

    renderer.render({
      headPosition: { x: 0, y: 0, z: 0 },
      headQuaternion: { x: 0, y: 0, z: 0, w: 1 },
      body: samples
    });

    const mesh = scene.getObjectByName('snake-body-voxels') as THREE.InstancedMesh;
    expect(renderer.renderedSegmentCount).toBe(samples.length);
    expect(renderer.capacity).toBeGreaterThanOrEqual(samples.length);
    expect(matrixPosition(mesh, 0).toArray()).toEqual([0, 0, 0]);
    expect(matrixPosition(mesh, 1).x).toBeCloseTo(0.1, 8);
    expect(samples.slice(0, 3).map((sample) => sample.id)).toEqual([100, 101, 102]);
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
