/** 懸垂：加重0のときはグラフ・集計で体重×回数とみなす */
export const PULL_UP_EXERCISE_ID = "pull_up";

export function effectiveSetVolumeKg(
  exerciseId: string,
  weightKg: number,
  reps: number,
  bodyWeightKg: number | null | undefined,
): number {
  if (
    exerciseId === PULL_UP_EXERCISE_ID &&
    weightKg <= 0 &&
    bodyWeightKg != null &&
    bodyWeightKg > 0
  ) {
    return bodyWeightKg * reps;
  }
  return weightKg * reps;
}
