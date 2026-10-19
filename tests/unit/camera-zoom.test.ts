import { describe, expect, it } from 'vitest';

type BoardCameraModule = {
  BoardCameraController: new () => {
    readonly zoomFactor: number;
    setZoomFactor: (factor: number) => void;
    apply: (aspect?: number) => Readonly<{ distance: number }>;
  };
};

async function loadBoardCamera(): Promise<BoardCameraModule | null> {
  try {
    const path = '../../src/render/' + 'board-camera';
    return await import(path) as BoardCameraModule;
  } catch {
    return null;
  }
}

describe('current board camera zoom', () => {
  it('applies one shared 0.65..5 zoom factor to distance from cube center', async () => {
    const module = await loadBoardCamera();
    expect(module).not.toBeNull();
    if (!module) return;
    const controller = new module.BoardCameraController();
    const baseline = controller.apply(1).distance;
    controller.setZoomFactor(2);
    expect(controller.zoomFactor).toBe(2);
    expect(controller.apply(1).distance).toBeCloseTo(baseline * 2, 10);
    controller.setZoomFactor(100);
    expect(controller.zoomFactor).toBe(5);
    controller.setZoomFactor(0.01);
    expect(controller.zoomFactor).toBe(0.65);
  });
});
