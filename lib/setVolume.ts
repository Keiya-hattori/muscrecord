import type { SetKind, WorkoutSetRow } from "@/lib/types";

export const PULL_UP_EXERCISE_ID = "pull_up";

/** インクラインベンチ: 片側（片腕）の負荷を入力 → ボリュームは両側分（×2） */
export const INCLINE_BENCH_PRESS_ID = "incline_bench_press";

/** 左右別入力（片手ずつ合算するダンベル系） */
export const UNILATERAL_DUMBBELL_IDS = new Set<string>([
  "incline_dumbbell_press",
  "lateral_raise",
  "front_raise",
  "rear_delt_fly",
  "bicep_curl",
  "standing_dumbbell_curl",
  "incline_bicep_curl",
  "hammer_curl",
  "preacher_curl",
  "lying_tricep_extension",
  "skull_crusher",
]);

const BARBELL_PER_SIDE_VOLUME_2X_IDS = new Set<string>([
  INCLINE_BENCH_PRESS_ID,
]);

export function normalizeSetKind(k: WorkoutSetRow["setKind"]): SetKind {
  if (k === "warmup" || k === "dropset") return k;
  return "main";
}

/** 称号・自己ベスト用の「メイン」セット数に含める */
export function countsAsMainSet(s: WorkoutSetRow): boolean {
  return normalizeSetKind(s.setKind) === "main";
}

/**
 * ボリューム（kg）— ウォームアップ/ドロップも含めて積算。
 * 懸垂・片側2入力・インクラインバーベル片側表記に対応。
 */
export function effectiveSetVolumeFromRow(
  s: WorkoutSetRow,
  bodyWeightKg: number | null | undefined,
): number {
  const { exerciseId, weightKg, reps, weightLeftKg, weightRightKg } = s;
  if (reps < 0) return 0;

  if (exerciseId === PULL_UP_EXERCISE_ID && bodyWeightKg != null && bodyWeightKg > 0) {
    const add = Math.max(0, weightKg);
    return (bodyWeightKg + add) * reps;
  }

  if (BARBELL_PER_SIDE_VOLUME_2X_IDS.has(exerciseId)) {
    return 2 * Math.max(0, weightKg) * reps;
  }

  if (UNILATERAL_DUMBBELL_IDS.has(exerciseId)) {
    const L =
      weightLeftKg != null && Number.isFinite(weightLeftKg) ? weightLeftKg : null;
    const R =
      weightRightKg != null && Number.isFinite(weightRightKg) ? weightRightKg : null;
    if (L !== null && R !== null) {
      return (L + R) * reps;
    }
    if (L !== null && R === null) return L * 2 * reps;
    if (L === null && R !== null) return R * 2 * reps;
    return Math.max(0, weightKg) * reps;
  }

  return Math.max(0, weightKg) * reps;
}

export function isUnilateralDumbbellExercise(exerciseId: string): boolean {
  return UNILATERAL_DUMBBELL_IDS.has(exerciseId);
}

export function isBarbellPerSideDoubleVolume(exerciseId: string): boolean {
  return BARBELL_PER_SIDE_VOLUME_2X_IDS.has(exerciseId);
}
