import type { ExerciseMaster } from "@/lib/types";

/** 記録画面トップの部位チップ（表示順） */
export type RecordBodyTabId =
  | "chest"
  | "back"
  | "shoulders"
  | "legs"
  | "biceps"
  | "triceps"
  | "core";

export const RECORD_BODY_TABS: { id: RecordBodyTabId; label: string }[] = [
  { id: "chest", label: "胸" },
  { id: "back", label: "背中" },
  { id: "shoulders", label: "肩" },
  { id: "legs", label: "脚" },
  { id: "biceps", label: "二頭筋" },
  { id: "triceps", label: "三頭筋" },
  { id: "core", label: "体幹" },
];

/** 種目が記録画面のどの部位タブに属するか */
export function recordTabForExercise(ex: ExerciseMaster): RecordBodyTabId {
  switch (ex.category) {
    case "chest":
      return "chest";
    case "back":
      return "back";
    case "shoulders":
      return "shoulders";
    case "legs":
      return "legs";
    case "core":
      return "core";
    case "arms":
      return ex.armFocus === "tricep" ? "triceps" : "biceps";
    default:
      return "chest";
  }
}

export function exercisesForRecordTab(
  tabId: RecordBodyTabId,
  all: ExerciseMaster[],
): ExerciseMaster[] {
  switch (tabId) {
    case "chest":
      return all.filter((e) => e.category === "chest");
    case "back":
      return all.filter((e) => e.category === "back");
    case "shoulders":
      return all.filter((e) => e.category === "shoulders");
    case "legs":
      return all.filter((e) => e.category === "legs");
    case "biceps":
      return all.filter((e) => e.category === "arms" && e.armFocus === "bicep");
    case "triceps":
      return all.filter((e) => e.category === "arms" && e.armFocus === "tricep");
    case "core":
      return all.filter((e) => e.category === "core");
    default:
      return [];
  }
}

const MAX_WEIGHT_KG = 200;
const BENCH_PRESS_MIN_WEIGHT_KG = 20;
const DUMBBELL_MIN_WEIGHT_KG = 1;
const DUMBBELL_SPLIT_WEIGHT_KG = 10;
const DUMBBELL_LOW_STEP_KG = 1;
const DUMBBELL_HIGH_STEP_KG = 2;

const DUMBBELL_EXERCISE_IDS = new Set<string>([
  "incline_dumbbell_press",
  "lateral_raise",
  "front_raise",
  "rear_delt_fly",
  "bicep_curl",
  "incline_bicep_curl",
  "hammer_curl",
  "preacher_curl",
  "lying_tricep_extension",
  "skull_crusher",
]);

function isDumbbellExercise(exerciseId?: string): boolean {
  if (!exerciseId) return false;
  return DUMBBELL_EXERCISE_IDS.has(exerciseId);
}

export function minWeightKgForExercise(exerciseId?: string): number {
  if (!exerciseId) return 0;
  if (exerciseId === "bench_press") return BENCH_PRESS_MIN_WEIGHT_KG;
  if (isDumbbellExercise(exerciseId)) return DUMBBELL_MIN_WEIGHT_KG;
  return 0;
}

function createWeightOptionsForExercise(exerciseId?: string): readonly number[] {
  if (isDumbbellExercise(exerciseId)) {
    const options: number[] = [];
    for (
      let w = DUMBBELL_MIN_WEIGHT_KG;
      w <= DUMBBELL_SPLIT_WEIGHT_KG;
      w += DUMBBELL_LOW_STEP_KG
    ) {
      options.push(w);
    }
    for (
      let w = DUMBBELL_SPLIT_WEIGHT_KG + DUMBBELL_HIGH_STEP_KG;
      w <= MAX_WEIGHT_KG;
      w += DUMBBELL_HIGH_STEP_KG
    ) {
      options.push(w);
    }
    return options;
  }
  if (exerciseId === "bench_press") {
    const options: number[] = [];
    for (let w = BENCH_PRESS_MIN_WEIGHT_KG; w <= MAX_WEIGHT_KG; w += 2.5) {
      options.push(Math.round(w * 10) / 10);
    }
    return options;
  }
  const options: number[] = [];
  for (let w = 0; w <= MAX_WEIGHT_KG; w += 2.5) {
    options.push(Math.round(w * 10) / 10);
  }
  return options;
}

const WEIGHT_OPTIONS_CACHE = new Map<string, readonly number[]>();

/** 種目ごとの重量選択肢（ネイティブ select のホイール操作向け） */
export function getWeightSelectOptionsForExercise(
  exerciseId?: string,
): readonly number[] {
  const key = exerciseId ?? "__default__";
  const cached = WEIGHT_OPTIONS_CACHE.get(key);
  if (cached) return cached;
  const created = createWeightOptionsForExercise(exerciseId);
  WEIGHT_OPTIONS_CACHE.set(key, created);
  return created;
}

export const REP_SELECT_OPTIONS: readonly number[] = Array.from(
  { length: 51 },
  (_, i) => i,
);

export function snapWeightToStepKg(w: number, exerciseId?: string): number {
  const clamped = Math.max(
    minWeightKgForExercise(exerciseId),
    Math.min(MAX_WEIGHT_KG, w),
  );
  if (isDumbbellExercise(exerciseId)) {
    if (clamped <= DUMBBELL_SPLIT_WEIGHT_KG) {
      return Math.round(clamped / DUMBBELL_LOW_STEP_KG) * DUMBBELL_LOW_STEP_KG;
    }
    return (
      Math.round(clamped / DUMBBELL_HIGH_STEP_KG) * DUMBBELL_HIGH_STEP_KG
    );
  }
  const s = Math.round(clamped / 2.5) * 2.5;
  return Math.round(s * 10) / 10;
}
