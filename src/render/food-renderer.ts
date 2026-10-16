import * as THREE from 'three';
import type { Vec3 } from '../game/types';
import { PALETTE } from './scene';

export const FOOD_RADIUS = 0.16 / 3;

export class FoodRenderer {
  private readonly geometry = new THREE.SphereGeometry(FOOD_RADIUS, 16, 12);
  private readonly material = new THREE.MeshStandardMaterial({
    color: PALETTE.accent,
    roughness: 0.42,
    metalness: 0.01
  });
  private readonly mesh = new THREE.Mesh(this.geometry, this.material);

  constructor(private readonly scene: THREE.Scene) {
    this.scene.add(this.mesh);
  }

  render(food: Vec3 | null): void {
    this.mesh.visible = food !== null;
    if (!food) return;
    this.mesh.position.set(food.x, food.y, food.z);
  }

  dispose(): void {
    this.scene.remove(this.mesh);
    this.geometry.dispose();
    this.material.dispose();
  }
}
