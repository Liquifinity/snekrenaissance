import * as THREE from 'three';
import { GRID_CONFIG, type GridConfig } from '../game/grid-config';
import type { Vec3 } from '../game/types';
import { PALETTE } from './scene';

export const FOOD_VOXEL_FILL = 0.8;
export const FOOD_VOXEL_SIZE = GRID_CONFIG.cellSize * FOOD_VOXEL_FILL;

export class FoodRenderer {
  private readonly geometry: THREE.BoxGeometry;
  private readonly material = new THREE.MeshStandardMaterial({
    color: PALETTE.accent,
    roughness: 0.48,
    metalness: 0.01,
    flatShading: true
  });
  private readonly mesh: THREE.Mesh;

  constructor(
    private readonly scene: THREE.Scene,
    config: GridConfig = GRID_CONFIG
  ) {
    const size = config.cellSize * FOOD_VOXEL_FILL;
    this.geometry = new THREE.BoxGeometry(size, size, size);
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.name = 'food-voxel';
    this.scene.add(this.mesh);
  }

  render(foodWorld: Vec3 | null): void {
    this.mesh.visible = foodWorld !== null;
    if (!foodWorld) return;
    this.mesh.position.set(foodWorld.x, foodWorld.y, foodWorld.z);
  }

  dispose(): void {
    this.scene.remove(this.mesh);
    this.geometry.dispose();
    this.material.dispose();
  }
}
