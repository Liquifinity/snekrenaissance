export const FOODS_PER_PROGRESS_STAGE = 10;
export const PROGRESS_STAGE_COUNT = 30;
export const COMPLETION_FOOD_TARGET = FOODS_PER_PROGRESS_STAGE * PROGRESS_STAGE_COUNT;

export function completionProgress(foodEaten: number): number {
  if (!Number.isFinite(foodEaten)) return 0;
  const safeFood = Math.max(0, Math.floor(foodEaten));
  const completedStages = Math.min(
    PROGRESS_STAGE_COUNT,
    Math.floor(safeFood / FOODS_PER_PROGRESS_STAGE)
  );
  return (completedStages / PROGRESS_STAGE_COUNT) * 100;
}

export function completionProgressLabel(foodEaten: number): string {
  return `${completionProgress(foodEaten).toFixed(1)}%`;
}
