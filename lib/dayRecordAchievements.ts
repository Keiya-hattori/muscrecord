import type { WorkoutSetRow } from "@/lib/types";
import {
  countsAsMainSet,
  effectiveSetVolumeFromRow,
} from "@/lib/setVolume";

function vol( s: WorkoutSetRow, bodyWeightKg?: number | null) {
  return effectiveSetVolumeFromRow(s, bodyWeightKg);
}

/** 総ボリューム（kg）＝ 換算（懸垂・片手別・IBP等を含む） */
export function totalVolumeKg(
  sets: WorkoutSetRow[],
  bodyWeightKg?: number | null,
): number {
  return sets.reduce((a, s) => a + vol(s, bodyWeightKg), 0);
}

/** メインセット数（称号・日ベストのセット数用。ウォームアップ/ドロップ除く） */
export function countMainSets(sets: WorkoutSetRow[]): number {
  return sets.filter(countsAsMainSet).length;
}

export function volumeByWorkoutId(
  sets: WorkoutSetRow[],
  bodyWeightKg?: number | null,
): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of sets) {
    const v = vol(s, bodyWeightKg);
    m.set(s.workoutId, (m.get(s.workoutId) ?? 0) + v);
  }
  return m;
}

/** 特定ワークアウトを除いた過去最大セッションボリューム */
export function maxOtherWorkoutVolumeKg(
  sets: WorkoutSetRow[],
  excludeWorkoutId: string,
  bodyWeightKg?: number | null,
): number {
  const m = volumeByWorkoutId(sets, bodyWeightKg);
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
  bodyWeightKg?: number | null,
): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of sets) {
    const v = vol(s, bodyWeightKg);
    m.set(s.exerciseId, (m.get(s.exerciseId) ?? 0) + v);
  }
  return m;
}

/** 同じ種目について、指定ワークアウト以外での最大ボリューム */
export function maxOtherExerciseVolumeKg(
  allSets: WorkoutSetRow[],
  exerciseId: string,
  excludeWorkoutId: string,
  bodyWeightKg?: number | null,
): number {
  let max = 0;
  const byWorkout = new Map<string, number>();
  for (const s of allSets) {
    if (s.exerciseId !== exerciseId) continue;
    if (s.workoutId === excludeWorkoutId) continue;
    const add = vol(s, bodyWeightKg);
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
