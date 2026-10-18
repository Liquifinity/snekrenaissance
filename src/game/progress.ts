export const COMPLETION_FOOD_TARGET = 33;

export function completionProgress(foodEaten: number): number {
  if (!Number.isFinite(foodEaten)) return 0;
  const safeFood = Math.max(0, Math.floor(foodEaten));
  return Math.min(safeFood / COMPLETION_FOOD_TARGET, 1) * 100;
}

export function completionProgressLabel(foodEaten: number): string {
  return `${completionProgress(foodEaten).toFixed(1)}%`;
}
