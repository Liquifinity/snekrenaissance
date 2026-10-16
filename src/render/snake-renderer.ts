import * as THREE from 'three';
import { GRID_CONFIG, type GridConfig } from '../game/grid-config';
import type { Vec3 } from '../game/types';
import type { InterpolatedFrame, InterpolatedSegment } from './interpolation';
import { PALETTE } from './scene';

export const SNAKE_VOXEL_FILL = 0.8;
export const SNAKE_VOXEL_SIZE = GRID_CONFIG.cellSize * SNAKE_VOXEL_FILL;
export const HEAD_VOXEL_SIZE = SNAKE_VOXEL_SIZE;
export const EYE_VOXEL_SIZE = GRID_CONFIG.cellSize * 0.12;
export const DEFAULT_RENDER_CAPACITY = 128;

export type VoxelSnakeRenderSnapshot = Readonly<{
  head: InterpolatedSegment;
  body: readonly InterpolatedSegment[];
  frame: InterpolatedFrame;
}>;

/** Temporary Task 7→10 bridge for the still-unmigrated browser loop. */
export type LegacySnakeRenderSnapshot = Readonly<{
  headWrapped: Vec3;
  bodyPositions: readonly Vec3[];
  forward?: Vec3;
  up?: Vec3;
}>;

function isVoxelSnapshot(
  snapshot: VoxelSnakeRenderSnapshot | LegacySnakeRenderSnapshot
): snapshot is VoxelSnakeRenderSnapshot {
  return 'head' in snapshot && 'body' in snapshot && 'frame' in snapshot;
}

function displayedPosition(segment: InterpolatedSegment): Vec3 {
  return {
    x: segment.position.x + segment.displayWrapOffset.x,
    y: segment.position.y + segment.displayWrapOffset.y,
    z: segment.position.z + segment.displayWrapOffset.z
  };
}

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
  private readonly defaultForward = new THREE.Vector3(0, 0, 1);
  private readonly legacyForward = new THREE.Vector3();
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

  render(snapshot: VoxelSnakeRenderSnapshot | LegacySnakeRenderSnapshot): void {
    if (isVoxelSnapshot(snapshot)) {
      this.renderVoxel(snapshot);
      return;
    }
    this.renderLegacyBridge(snapshot);
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

  private renderVoxel(snapshot: VoxelSnakeRenderSnapshot): void {
    const headPosition = displayedPosition(snapshot.head);
    this.headMesh.position.set(headPosition.x, headPosition.y, headPosition.z);
    this.headMesh.quaternion.set(
      snapshot.frame.quaternion.x,
      snapshot.frame.quaternion.y,
      snapshot.frame.quaternion.z,
      snapshot.frame.quaternion.w
    ).normalize();

    this.ensureCapacity(snapshot.body.length);
    this.bodyMesh.count = snapshot.body.length;

    for (let index = 0; index < snapshot.body.length; index += 1) {
      const segment = snapshot.body[index];
      const position = displayedPosition(segment);
      this.transform.position.set(position.x, position.y, position.z);
      this.transform.quaternion.identity();
      const scale = segment.born ? Math.max(0.05, segment.birthAlpha) : 1;
      this.transform.scale.setScalar(scale);
      this.transform.updateMatrix();
      this.bodyMesh.setMatrixAt(index, this.transform.matrix);
    }

    this.bodyMesh.instanceMatrix.needsUpdate = true;
  }

  /** Remove in Task 10 when main.ts consumes InterpolatedTransition directly. */
  private renderLegacyBridge(snapshot: LegacySnakeRenderSnapshot): void {
    this.headMesh.position.set(
      snapshot.headWrapped.x,
      snapshot.headWrapped.y,
      snapshot.headWrapped.z
    );

    const forward = snapshot.forward ?? { x: 0, y: 0, z: 1 };
    this.legacyForward.set(forward.x, forward.y, forward.z);
    if (this.legacyForward.lengthSq() < 1e-8) {
      this.legacyForward.copy(this.defaultForward);
    } else {
      this.legacyForward.normalize();
    }
    this.headMesh.quaternion.setFromUnitVectors(this.defaultForward, this.legacyForward);

    this.ensureCapacity(snapshot.bodyPositions.length);
    this.bodyMesh.count = snapshot.bodyPositions.length;
    for (let index = 0; index < snapshot.bodyPositions.length; index += 1) {
      const position = snapshot.bodyPositions[index];
      this.transform.position.set(position.x, position.y, position.z);
      this.transform.quaternion.identity();
      this.transform.scale.setScalar(1);
      this.transform.updateMatrix();
      this.bodyMesh.setMatrixAt(index, this.transform.matrix);
    }
    this.bodyMesh.instanceMatrix.needsUpdate = true;
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
