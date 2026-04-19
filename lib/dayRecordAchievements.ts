import type { WorkoutSetRow } from "@/lib/types";

/** 総ボリューム（kg）＝ Σ(重量×回数） */
export function totalVolumeKg(sets: WorkoutSetRow[]): number {
  return sets.reduce((a, s) => a + s.weightKg * s.reps, 0);
}

export function volumeByWorkoutId(sets: WorkoutSetRow[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of sets) {
    const v = s.weightKg * s.reps;
    m.set(s.workoutId, (m.get(s.workoutId) ?? 0) + v);
  }
  return m;
}

/** 特定ワークアウトを除いた過去最大セッションボリューム */
export function maxOtherWorkoutVolumeKg(
  sets: WorkoutSetRow[],
  excludeWorkoutId: string,
): number {
  const m = volumeByWorkoutId(sets);
  let max = 0;
  for (const [wid, v] of m) {
    if (wid === excludeWorkoutId) continue;
    if (v > max) max = v;
  }
  return max;
}

/** 種目別ボリューム（当セッション） */
export function volumeByExerciseInSets(
  sets: WorkoutSetRow[],
): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of sets) {
    const v = s.weightKg * s.reps;
    m.set(s.exerciseId, (m.get(s.exerciseId) ?? 0) + v);
  }
  return m;
}

/** 同じ種目について、指定ワークアウト以外での最大ボリューム */
export function maxOtherExerciseVolumeKg(
  allSets: WorkoutSetRow[],
  exerciseId: string,
  excludeWorkoutId: string,
): number {
  let max = 0;
  const byWorkout = new Map<string, number>();
  for (const s of allSets) {
    if (s.exerciseId !== exerciseId) continue;
    if (s.workoutId === excludeWorkoutId) continue;
    const add = s.weightKg * s.reps;
    byWorkout.set(
      s.workoutId,
      (byWorkout.get(s.workoutId) ?? 0) + add,
    );
  }
  for (const v of byWorkout.values()) {
    if (v > max) max = v;
  }
  return max;
}

export function countDistinctExercises(sets: WorkoutSetRow[]): number {
  return new Set(sets.map((s) => s.exerciseId)).size;
}
