export type InputState = {
  yaw: number;
  pitch: number;
};

export function neutralInput(): InputState {
  return { yaw: 0, pitch: 0 };
}

export function clampInputAxis(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-1, Math.min(1, value));
}
