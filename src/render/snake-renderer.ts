import * as THREE from 'three';
import { GRID_CONFIG, type GridConfig } from '../game/grid-config';
import type { Vec3 } from '../game/types';
import { PALETTE } from './scene';

export const SNAKE_VOXEL_FILL = 0.8;
export const SNAKE_VOXEL_SIZE = GRID_CONFIG.cellSize * SNAKE_VOXEL_FILL;
export const HEAD_VOXEL_SIZE = SNAKE_VOXEL_SIZE;
export const EYE_VOXEL_SIZE = GRID_CONFIG.cellSize * 0.12;
export const DEFAULT_RENDER_CAPACITY = 128;

export type VoxelBodySample = Readonly<{
  id: number;
  position: Vec3;
}>;

export type VoxelSnakeRenderSnapshot = Readonly<{
  headPosition: Vec3;
  headQuaternion: Readonly<{ x: number; y: number; z: number; w: number }>;
  body: readonly VoxelBodySample[];
}>;

export class SnakeRenderer {
  private readonly bodyGeometry: THREE.BoxGeometry;
  private readonly headGeometry: THREE.BoxGeometry;
  private readonly eyeGeometry: THREE.BoxGeometry;
  private readonly material = new THREE.MeshStandardMaterial({
    color: PALETTE.accent,
    roughness: 0.62,
    metalness: 0.01,
    flatShading: true
  });
  private readonly eyeMaterial = new THREE.MeshBasicMaterial({ color: PALETTE.dark });
  private bodyMesh: THREE.InstancedMesh;
  private readonly headMesh: THREE.Mesh;
  private readonly leftEye: THREE.Mesh;
  private readonly rightEye: THREE.Mesh;
  private readonly transform = new THREE.Object3D();
  private instanceCapacity: number;

  constructor(
    private readonly scene: THREE.Scene,
    initialCapacity = DEFAULT_RENDER_CAPACITY,
    private readonly config: GridConfig = GRID_CONFIG
  ) {
    if (!Number.isInteger(initialCapacity) || initialCapacity < 1) {
      throw new RangeError('Snake render capacity must be a positive integer.');
    }

    const snakeSize = config.cellSize * SNAKE_VOXEL_FILL;
    const eyeSize = config.cellSize * 0.12;
    this.bodyGeometry = new THREE.BoxGeometry(snakeSize, snakeSize, snakeSize);
    this.headGeometry = new THREE.BoxGeometry(snakeSize, snakeSize, snakeSize);
    this.eyeGeometry = new THREE.BoxGeometry(eyeSize, eyeSize, eyeSize * 0.5);

    this.instanceCapacity = initialCapacity;
    this.bodyMesh = this.createBodyMesh(initialCapacity);
    this.bodyMesh.name = 'snake-body-voxels';

    this.headMesh = new THREE.Mesh(this.headGeometry, this.material);
    this.headMesh.name = 'snake-head';

    const eyeX = snakeSize * 0.24;
    const eyeY = snakeSize * 0.18;
    const eyeZ = snakeSize / 2 + (eyeSize * 0.5) / 2;

    this.leftEye = new THREE.Mesh(this.eyeGeometry, this.eyeMaterial);
    this.leftEye.name = 'snake-eye-left';
    this.leftEye.position.set(-eyeX, eyeY, eyeZ);

    this.rightEye = new THREE.Mesh(this.eyeGeometry, this.eyeMaterial);
    this.rightEye.name = 'snake-eye-right';
    this.rightEye.position.set(eyeX, eyeY, eyeZ);

    this.headMesh.add(this.leftEye, this.rightEye);
    this.scene.add(this.bodyMesh, this.headMesh);
  }

  get capacity(): number {
    return this.instanceCapacity;
  }

  get renderedSegmentCount(): number {
    return this.bodyMesh.count;
  }

  render(snapshot: VoxelSnakeRenderSnapshot): void {
    this.headMesh.position.set(
      snapshot.headPosition.x,
      snapshot.headPosition.y,
      snapshot.headPosition.z
    );
    this.headMesh.quaternion.set(
      snapshot.headQuaternion.x,
      snapshot.headQuaternion.y,
      snapshot.headQuaternion.z,
      snapshot.headQuaternion.w
    ).normalize();

    this.ensureCapacity(snapshot.body.length);
    this.bodyMesh.count = snapshot.body.length;

    for (let index = 0; index < snapshot.body.length; index += 1) {
      const sample = snapshot.body[index];
      this.transform.position.set(sample.position.x, sample.position.y, sample.position.z);
      this.transform.quaternion.identity();
      this.transform.scale.setScalar(1);
      this.transform.updateMatrix();
      this.bodyMesh.setMatrixAt(index, this.transform.matrix);
    }

    this.bodyMesh.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.headMesh.remove(this.leftEye, this.rightEye);
    this.scene.remove(this.bodyMesh, this.headMesh);
    this.bodyMesh.dispose();
    this.bodyGeometry.dispose();
    this.headGeometry.dispose();
    this.eyeGeometry.dispose();
    this.material.dispose();
    this.eyeMaterial.dispose();
  }

  private createBodyMesh(capacity: number): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(this.bodyGeometry, this.material, capacity);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.count = 0;
    return mesh;
  }

  private ensureCapacity(required: number): void {
    if (required <= this.instanceCapacity) return;

    let nextCapacity = this.instanceCapacity;
    while (nextCapacity < required) nextCapacity *= 2;

    const oldMesh = this.bodyMesh;
    this.bodyMesh = this.createBodyMesh(nextCapacity);
    this.bodyMesh.name = 'snake-body-voxels';
    this.instanceCapacity = nextCapacity;
    this.scene.remove(oldMesh);
    oldMesh.dispose();
    this.scene.add(this.bodyMesh);
  }
}
