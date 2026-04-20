/** 懸垂：体重をベースに、加重があれば上乗せして換算する */
export const PULL_UP_EXERCISE_ID = "pull_up";

export function effectiveSetVolumeKg(
  exerciseId: string,
  weightKg: number,
  reps: number,
  bodyWeightKg: number | null | undefined,
): number {
  if (exerciseId === PULL_UP_EXERCISE_ID && bodyWeightKg != null && bodyWeightKg > 0) {
    const additionalWeightKg = Math.max(0, weightKg);
    return (bodyWeightKg + additionalWeightKg) * reps;
  }
  return weightKg * reps;
}
