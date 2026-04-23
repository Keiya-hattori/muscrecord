import { effectiveSetVolumeFromRow } from "@/lib/setVolume";
import type { WorkoutSetRow } from "@/lib/types";

export { PULL_UP_EXERCISE_ID } from "@/lib/setVolume";

/** 互換: 行全体がない箇所向け。懸垂以外は従来どおり 重量×回数。 */
export function effectiveSetVolumeKg(
  exerciseId: string,
  weightKg: number,
  reps: number,
  bodyWeightKg: number | null | undefined,
): number {
  const row: WorkoutSetRow = {
    id: "",
    workoutId: "",
    exerciseId,
    order: 0,
    weightKg,
    reps,
  };
  return effectiveSetVolumeFromRow(row, bodyWeightKg);
}
