import * as THREE from 'three';
import { WORLD_SIZE } from '../game/constants';

export const PALETTE = {
  background: '#ffffff',
  guides: '#93c5fd',
  cubeTint: '#eff6ff',
  accent: '#3b82f6',
  dark: '#111827'
} as const;

export const CUBE_WALL_STYLE = 'tinted-grid' as const;
export const CUBE_GUIDE_OPACITY = 0.55;
export const CUBE_GRID_FACE_COUNT = 6;
export const CUBE_GRID_DIVISIONS = 16;
export const CUBE_FACE_GRID_OPACITY = 0.18;
export const CUBE_FACE_TINT_OPACITY = 0.045;

export type SceneContext = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  render: () => void;
  resize: (width: number, height: number, pixelRatio?: number) => void;
  dispose: () => void;
};

type GridFace = {
  helper: THREE.GridHelper;
  materials: THREE.Material[];
};

function materialList(material: THREE.Material | THREE.Material[]): THREE.Material[] {
  return Array.isArray(material) ? material : [material];
}

function createGridFace(
  position: readonly [number, number, number],
  rotation: readonly [number, number, number]
): GridFace {
  const helper = new THREE.GridHelper(
    WORLD_SIZE,
    CUBE_GRID_DIVISIONS,
    PALETTE.guides,
    PALETTE.guides
  );
  helper.position.set(...position);
  helper.rotation.set(...rotation);

  const materials = materialList(helper.material);
  for (const material of materials) {
    material.transparent = true;
    material.opacity = CUBE_FACE_GRID_OPACITY;
    material.depthWrite = false;
  }

  return { helper, materials };
}

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

  const cubeTintMaterial = new THREE.MeshBasicMaterial({
    color: PALETTE.cubeTint,
    transparent: true,
    opacity: CUBE_FACE_TINT_OPACITY,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const cubeTint = new THREE.Mesh(cubeGeometry, cubeTintMaterial);
  scene.add(cubeTint);

  const half = WORLD_SIZE / 2;
  const inset = 0.01;
  const inner = half - inset;
  const gridFaces: GridFace[] = [
    createGridFace([0, -inner, 0], [0, 0, 0]),
    createGridFace([0, inner, 0], [0, 0, 0]),
    createGridFace([0, 0, -inner], [Math.PI / 2, 0, 0]),
    createGridFace([0, 0, inner], [Math.PI / 2, 0, 0]),
    createGridFace([-inner, 0, 0], [0, 0, Math.PI / 2]),
    createGridFace([inner, 0, 0], [0, 0, Math.PI / 2])
  ];

  for (const face of gridFaces) {
    scene.add(face.helper);
  }

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
      scene.remove(cubeEdges, cubeTint, ...gridFaces.map((face) => face.helper));
      cubeGeometry.dispose();
      edgeGeometry.dispose();
      edgeMaterial.dispose();
      cubeTintMaterial.dispose();
      for (const face of gridFaces) {
        face.helper.geometry.dispose();
        face.materials.forEach((material) => material.dispose());
      }
      renderer.dispose();
    }
  };
}
