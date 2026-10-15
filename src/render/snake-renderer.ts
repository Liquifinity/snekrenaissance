import * as THREE from 'three';
import { WORLD_SIZE } from '../game/constants';
import { wrapVec3 } from '../game/torus';
import type { Vec3 } from '../game/types';
import { PALETTE } from './scene';

export const BODY_RADIUS = 0.16;
export const HEAD_RADIUS = 0.17;
export const MAX_RENDER_SEGMENTS = 4096;

export type SnakeRenderSnapshot = {
  headWrapped: Vec3;
  bodyPositions: readonly Vec3[];
};

export class SnakeRenderer {
  private readonly bodyGeometry = new THREE.SphereGeometry(BODY_RADIUS, 14, 10);
  private readonly headGeometry = new THREE.SphereGeometry(HEAD_RADIUS, 16, 12);
  private readonly material = new THREE.MeshStandardMaterial({
    color: PALETTE.accent,
    roughness: 0.5,
    metalness: 0.02
  });
  private readonly bodyMesh: THREE.InstancedMesh;
  private readonly headMesh: THREE.Mesh;
  private readonly transform = new THREE.Object3D();

  constructor(private readonly scene: THREE.Scene, maxSegments = MAX_RENDER_SEGMENTS) {
    this.bodyMesh = new THREE.InstancedMesh(
      this.bodyGeometry,
      this.material,
      maxSegments
    );
    this.bodyMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.bodyMesh.count = 0;
    this.headMesh = new THREE.Mesh(this.headGeometry, this.material);
    this.scene.add(this.bodyMesh, this.headMesh);
  }

  render(snapshot: SnakeRenderSnapshot): void {
    this.headMesh.position.set(
      snapshot.headWrapped.x,
      snapshot.headWrapped.y,
      snapshot.headWrapped.z
    );

    const count = Math.min(snapshot.bodyPositions.length, this.bodyMesh.instanceMatrix.count);
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
    this.scene.remove(this.bodyMesh, this.headMesh);
    this.bodyGeometry.dispose();
    this.headGeometry.dispose();
    this.material.dispose();
    this.bodyMesh.dispose();
  }
}
