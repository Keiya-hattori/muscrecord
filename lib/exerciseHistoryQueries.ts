import { PULL_UP_EXERCISE_ID } from "@/lib/effectiveVolume";
import { countsAsMainSet, effectiveSetVolumeFromRow } from "@/lib/setVolume";
import type { WorkoutSetRow } from "@/lib/types";
import { loadAllWorkoutsWithVolume, type WorkoutWithVolume } from "@/lib/stats";

export type BestDaySetRow = {
  weightKg: number;
  reps: number;
  /** 換算ボリューム（kg）— 懸垂0kg時は体重×回数 */
  volume: number;
  order: number;
};

/** その日のメイン合計ボリュームが最大の日のメインセット */
export type BestDayStandard = {
  kind: "standard";
  dateKey: string;
  sets: BestDaySetRow[];
  totalVolume: number;
};

/** メイン合計回数が最大の日のメインセット（懸垂） */
export type BestDayPullup = {
  kind: "pullup";
  dateKey: string;
  sets: BestDaySetRow[];
  totalReps: number;
};

export type BestDayResult = BestDayStandard | BestDayPullup;

export type ExerciseDaySummary = {
  dateKey: string;
  /** 換算ボリューム（懸垂は体重×回数） */
  volumeKg: number;
  setCount: number;
};

type SetWithWorkout = { s: WorkoutSetRow; w: WorkoutWithVolume };

function sortSetsToRows(
  arr: SetWithWorkout[],
  exerciseId: string,
  bodyWeightKg: number | null,
): BestDaySetRow[] {
  const mainOnly = arr.filter(({ s }) => countsAsMainSet(s));
  const sorted = [...mainOnly].sort((a, b) => {
    if (a.w.startedAt !== b.w.startedAt) return a.w.startedAt - b.w.startedAt;
    return a.s.order - b.s.order;
  });
  return sorted.map(({ s }) => ({
    weightKg: s.weightKg,
    reps: s.reps,
    volume: effectiveSetVolumeFromRow(s, bodyWeightKg),
    order: s.order,
  }));
}

/** 歴代「ベストの日」— メインセットのみ比較・列挙。懸垂はメイン合計回数で比較 */
export function computeBestDayForExercise(
  exerciseId: string,
  workouts: WorkoutWithVolume[],
  bodyWeightKg: number | null,
): BestDayResult | null {
  const byDate = new Map<string, SetWithWorkout[]>();
  for (const w of workouts) {
    for (const s of w.sets) {
      if (s.exerciseId !== exerciseId) continue;
      const dk = w.sessionDate;
      const cur = byDate.get(dk) ?? [];
      cur.push({ s, w });
      byDate.set(dk, cur);
    }
  }
  if (byDate.size === 0) return null;

  if (exerciseId === PULL_UP_EXERCISE_ID) {
    let bestDate: string | null = null;
    let maxReps = -1;
    for (const [dk, arr] of byDate) {
      const totalReps = arr.reduce(
        (sum, { s }) => sum + (countsAsMainSet(s) ? s.reps : 0),
        0,
      );
      if (
        totalReps > maxReps ||
        (totalReps === maxReps && bestDate !== null && dk > bestDate)
      ) {
        maxReps = totalReps;
        bestDate = dk;
      }
    }
    if (bestDate === null || maxReps < 0) return null;
    const arr = byDate.get(bestDate)!;
    const sets = sortSetsToRows(arr, exerciseId, bodyWeightKg);
    const totalReps = arr
      .filter(({ s }) => countsAsMainSet(s))
      .reduce((a, { s }) => a + s.reps, 0);
    return {
      kind: "pullup",
      dateKey: bestDate,
      sets,
      totalReps,
    };
  }

  let bestDate: string | null = null;
  let maxVol = -1;
  for (const [dk, arr] of byDate) {
    const totalVol = arr.reduce(
      (sum, { s }) =>
        sum +
        (countsAsMainSet(s)
          ? effectiveSetVolumeFromRow(s, bodyWeightKg)
          : 0),
      0,
    );
    if (
      totalVol > maxVol ||
      (totalVol === maxVol && bestDate !== null && dk > bestDate)
    ) {
      maxVol = totalVol;
      bestDate = dk;
    }
  }
  if (bestDate === null || maxVol < 0) return null;
  const arr = byDate.get(bestDate)!;
  const sets = sortSetsToRows(arr, exerciseId, bodyWeightKg);
  const totalVolume = sets.reduce((a, r) => a + r.volume, 0);
  return {
    kind: "standard",
    dateKey: bestDate,
    sets,
    totalVolume,
  };
}

function aggregateDaysForExercise(
  exerciseId: string,
  workouts: WorkoutWithVolume[],
  bodyWeightKg: number | null,
): ExerciseDaySummary[] {
  const byDate = new Map<string, { volumeKg: number; setCount: number }>();
  for (const w of workouts) {
    for (const s of w.sets) {
      if (s.exerciseId !== exerciseId) continue;
      if (!countsAsMainSet(s)) continue;
      const dk = w.sessionDate;
      const cur = byDate.get(dk) ?? { volumeKg: 0, setCount: 0 };
      cur.volumeKg += effectiveSetVolumeFromRow(s, bodyWeightKg);
      cur.setCount += 1;
      byDate.set(dk, cur);
    }
  }
  return [...byDate.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([dateKey, v]) => ({
      dateKey,
      volumeKg: v.volumeKg,
      setCount: v.setCount,
    }));
}

export function getRecentDaysForExercise(
  exerciseId: string,
  workouts: WorkoutWithVolume[],
  limit: number,
  bodyWeightKg: number | null,
): ExerciseDaySummary[] {
  return aggregateDaysForExercise(exerciseId, workouts, bodyWeightKg).slice(
    0,
    limit,
  );
}

export function getAllDaysForExercise(
  exerciseId: string,
  workouts: WorkoutWithVolume[],
  bodyWeightKg: number | null,
): ExerciseDaySummary[] {
  return aggregateDaysForExercise(exerciseId, workouts, bodyWeightKg);
}

export async function loadWorkoutsForHistory(): Promise<WorkoutWithVolume[]> {
  return loadAllWorkoutsWithVolume();
}
