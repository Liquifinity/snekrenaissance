import * as THREE from 'three';
import { WORLD_SIZE } from '../game/constants';
import { wrapVec3 } from '../game/torus';
import type { Vec3 } from '../game/types';
import { PALETTE } from './scene';

export const BODY_RADIUS = 0.16 / 3;
export const HEAD_RADIUS = 0.17 / 3;
export const EYE_RADIUS = 0.009;
export const DEFAULT_RENDER_CAPACITY = 128;

export type SnakeRenderSnapshot = {
  headWrapped: Vec3;
  bodyPositions: readonly Vec3[];
  forward?: Vec3;
  up?: Vec3;
};

export class SnakeRenderer {
  private readonly bodyGeometry = new THREE.SphereGeometry(BODY_RADIUS, 14, 10);
  private readonly headGeometry = new THREE.SphereGeometry(HEAD_RADIUS, 16, 12);
  private readonly eyeGeometry = new THREE.SphereGeometry(EYE_RADIUS, 10, 8);
  private readonly material = new THREE.MeshStandardMaterial({
    color: PALETTE.accent,
    roughness: 0.5,
    metalness: 0.02
  });
  private readonly eyeMaterial = new THREE.MeshBasicMaterial({ color: PALETTE.dark });
  private bodyMesh: THREE.InstancedMesh;
  private readonly headMesh: THREE.Mesh;
  private readonly leftEye: THREE.Mesh;
  private readonly rightEye: THREE.Mesh;
  private readonly transform = new THREE.Object3D();
  private readonly defaultForward = new THREE.Vector3(0, 0, 1);
  private readonly headForward = new THREE.Vector3();
  private instanceCapacity: number;

  constructor(private readonly scene: THREE.Scene, initialCapacity = DEFAULT_RENDER_CAPACITY) {
    if (!Number.isInteger(initialCapacity) || initialCapacity < 1) {
      throw new RangeError('Snake render capacity must be a positive integer.');
    }
    this.instanceCapacity = initialCapacity;
    this.bodyMesh = this.createBodyMesh(initialCapacity);
    this.headMesh = new THREE.Mesh(this.headGeometry, this.material);

    this.leftEye = new THREE.Mesh(this.eyeGeometry, this.eyeMaterial);
    this.leftEye.name = 'snake-eye-left';
    this.leftEye.position.set(-0.021, 0.012, HEAD_RADIUS * 0.87);

    this.rightEye = new THREE.Mesh(this.eyeGeometry, this.eyeMaterial);
    this.rightEye.name = 'snake-eye-right';
    this.rightEye.position.set(0.021, 0.012, HEAD_RADIUS * 0.87);

    this.headMesh.add(this.leftEye, this.rightEye);
    this.scene.add(this.bodyMesh, this.headMesh);
  }

  get capacity(): number {
    return this.instanceCapacity;
  }

  get renderedSegmentCount(): number {
    return this.bodyMesh.count;
  }

  render(snapshot: SnakeRenderSnapshot): void {
    this.headMesh.position.set(
      snapshot.headWrapped.x,
      snapshot.headWrapped.y,
      snapshot.headWrapped.z
    );

    const forward = snapshot.forward ?? { x: 0, y: 0, z: 1 };
    this.headForward.set(forward.x, forward.y, forward.z);
    if (this.headForward.lengthSq() < 1e-8) {
      this.headForward.copy(this.defaultForward);
    } else {
      this.headForward.normalize();
    }
    this.headMesh.quaternion.setFromUnitVectors(this.defaultForward, this.headForward);

    this.ensureCapacity(snapshot.bodyPositions.length);
    const count = snapshot.bodyPositions.length;
    this.bodyMesh.count = count;

    for (let index = 0; index < count; index += 1) {
      const wrapped = wrapVec3(snapshot.bodyPositions[index], WORLD_SIZE);
      this.transform.position.set(wrapped.x, wrapped.y, wrapped.z);
      this.transform.rotation.set(0, 0, 0);
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
    const mesh = new THREE.InstancedMesh(
      this.bodyGeometry,
      this.material,
      capacity
    );
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.count = 0;
    return mesh;
  }

  private ensureCapacity(required: number): void {
    if (required <= this.instanceCapacity) return;

    let nextCapacity = this.instanceCapacity;
    while (nextCapacity < required) {
      nextCapacity *= 2;
    }

    const oldMesh = this.bodyMesh;
    this.bodyMesh = this.createBodyMesh(nextCapacity);
    this.instanceCapacity = nextCapacity;
    this.scene.remove(oldMesh);
    oldMesh.dispose();
    this.scene.add(this.bodyMesh);
  }
}
