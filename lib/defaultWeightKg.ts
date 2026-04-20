import { snapWeightToStepKg } from "@/lib/recordBodyTabs";
import { loadExerciseCatalog } from "@/lib/exerciseCatalog";

/**
 * 筋トレ約2年・中級者想定の「まず置く」デフォルト重量（kg）。
 * ダンベル系は片手あたり、マシンはスタックの目安。
 */
const DEFAULT_KG_BY_EXERCISE: Record<string, number> = {
  bench_press: 70,
  incline_dumbbell_press: 26,
  cable_crossover: 15,
  pec_deck: 40,
  pushup: 0,
  barbell_row: 65,
  lat_pulldown: 52.5,
  seated_cable_row: 45,
  pull_up: 0,
  hyper_extension: 25,
  squat: 100,
  deadlift: 120,
  half_deadlift: 110,
  leg_press: 140,
  leg_curl: 32.5,
  leg_extension: 40,
  ohp: 42.5,
  lateral_raise: 7.5,
  front_raise: 10,
  rear_delt_fly: 10,
  upright_row: 35,
  bicep_curl: 12.5,
  incline_bicep_curl: 11,
  hammer_curl: 15,
  preacher_curl: 12.5,
  lying_tricep_extension: 17.5,
  tricep_pushdown: 25,
  skull_crusher: 27.5,
  plank: 0,
  crunch: 0,
  hanging_leg_raise: 0,
  cable_crunch: 32.5,
  ab_wheel: 0,
};

export const DEFAULT_REPS_FOR_NEW_SET = 8;

export function getBaseDefaultWeightKgForExercise(exerciseId: string): number {
  const raw = DEFAULT_KG_BY_EXERCISE[exerciseId];
  if (raw !== undefined) return snapWeightToStepKg(raw, exerciseId);
  return snapWeightToStepKg(40, exerciseId);
}

export function getDefaultWeightKgForExercise(exerciseId: string): number {
  if (typeof window === "undefined") {
    return getBaseDefaultWeightKgForExercise(exerciseId);
  }
  const state = loadExerciseCatalog();
  const overridden = state.defaultWeightKgById[exerciseId];
  if (typeof overridden === "number" && Number.isFinite(overridden)) {
    return snapWeightToStepKg(overridden, exerciseId);
  }
  return getBaseDefaultWeightKgForExercise(exerciseId);
}
