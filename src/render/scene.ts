import * as THREE from 'three';
import { WORLD_SIZE } from '../game/constants';

export const PALETTE = {
  background: '#ffffff',
  guides: '#e5e7eb',
  accent: '#3b82f6',
  dark: '#111827'
} as const;

export const CUBE_WALL_STYLE = 'edges' as const;
export const CUBE_GUIDE_OPACITY = 0.28;

export type SceneContext = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  render: () => void;
  resize: (width: number, height: number, pixelRatio?: number) => void;
  dispose: () => void;
};

export function createScene(canvas: HTMLCanvasElement): SceneContext {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.background);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.05, 100);
  camera.position.set(0, 2.4, -7.5);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const ambient = new THREE.HemisphereLight(0xffffff, 0xdbe3ef, 1.55);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xffffff, 1.7);
  key.position.set(4, 7, -5);
  scene.add(key);

  const cubeGeometry = new THREE.BoxGeometry(WORLD_SIZE, WORLD_SIZE, WORLD_SIZE);
  const edgeGeometry = new THREE.EdgesGeometry(cubeGeometry);
  const edgeMaterial = new THREE.LineBasicMaterial({
    color: PALETTE.guides,
    transparent: true,
    opacity: CUBE_GUIDE_OPACITY
  });
  const cubeEdges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
  scene.add(cubeEdges);

  const floorGrid = new THREE.GridHelper(
    WORLD_SIZE,
    16,
    PALETTE.guides,
    PALETTE.guides
  );
  floorGrid.position.y = -WORLD_SIZE / 2;
  const floorMaterials = Array.isArray(floorGrid.material)
    ? floorGrid.material
    : [floorGrid.material];
  for (const material of floorMaterials) {
    material.transparent = true;
    material.opacity = 0.12;
  }
  scene.add(floorGrid);

  return {
    scene,
    camera,
    renderer,
    render: () => renderer.render(scene, camera),
    resize: (width, height, pixelRatio = window.devicePixelRatio || 1) => {
      const safeWidth = Math.max(1, Math.floor(width));
      const safeHeight = Math.max(1, Math.floor(height));
      renderer.setPixelRatio(Math.min(2, Math.max(1, pixelRatio)));
      renderer.setSize(safeWidth, safeHeight, false);
      camera.aspect = safeWidth / safeHeight;
      camera.updateProjectionMatrix();
    },
    dispose: () => {
      cubeGeometry.dispose();
      edgeGeometry.dispose();
      edgeMaterial.dispose();
      floorMaterials.forEach((material) => material.dispose());
      renderer.dispose();
    }
  };
}
