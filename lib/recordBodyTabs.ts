import { getExerciseById } from "@/lib/exercises";
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

function isDumbbellExercise(exerciseId?: string): boolean {
  if (!exerciseId) return false;
  return DUMBBELL_EXERCISE_IDS.has(exerciseId);
}

/** 名前に「ケーブル」が付くマシン＋既知ID。スタックは1.25kg起点・2.5kg刻み、追加で0.625kgを最大2枚 */
const CABLE_STACK_KNOWN_IDS = new Set<string>([
  "cable_crossover",
  "seated_cable_row",
  "cable_crunch",
  "tricep_pushdown",
]);

export function isCableStackExercise(exerciseId?: string): boolean {
  if (!exerciseId) return false;
  if (CABLE_STACK_KNOWN_IDS.has(exerciseId)) return true;
  return getExerciseById(exerciseId)?.name.includes("ケーブル") ?? false;
}

const CABLE_BASE_START_KG = 1.25;
const CABLE_BASE_STEP_KG = 2.5;
/** 0.625kg プレート 0枚 / 1枚 / 2枚 分 */
export const CABLE_ADDON_KG = [0, 0.625, 1.25] as const;
export type CableAddonKg = (typeof CABLE_ADDON_KG)[number];

/** 1.25kg から 2.5kg 刻みのスタック側のみ（0.625 は含めない） */
export function getCableBaseStackOptions(): number[] {
  const out: number[] = [];
  for (
    let b = CABLE_BASE_START_KG;
    b <= MAX_WEIGHT_KG + 1e-6;
    b += CABLE_BASE_STEP_KG
  ) {
    if (b > MAX_WEIGHT_KG) break;
    out.push(Math.round(b * 1000) / 1000);
  }
  return out;
}

function buildCableStackWeightOptions(): number[] {
  const s = new Set<number>();
  for (const base of getCableBaseStackOptions()) {
    for (const add of CABLE_ADDON_KG) {
      const v = Math.round((base + add) * 1000) / 1000;
      if (v > MAX_WEIGHT_KG) break;
      if (v < CABLE_BASE_START_KG - 1e-6) continue;
      s.add(v);
    }
  }
  return [...s].sort((a, b) => a - b);
}

/**
 * 保存済みの合計 kg から、スタックと 0.625 追加量に分解（スナップあり）。
 */
export function decomposeCableStackWeight(
  totalKg: number,
  exerciseId?: string,
): { base: number; addon: CableAddonKg } {
  if (!isCableStackExercise(exerciseId)) {
    return { base: CABLE_BASE_START_KG, addon: 0 };
  }
  const clamped = Math.max(
    minWeightKgForExercise(exerciseId),
    Math.min(MAX_WEIGHT_KG, totalKg),
  );
  const valid = getWeightSelectOptionsForExercise(exerciseId);
  const t = snapToNearestInList(clamped, valid);
  const bases = getCableBaseStackOptions();
  const EPS = 1e-3;
  for (const addon of CABLE_ADDON_KG) {
    const b = t - addon;
    const found = bases.find((x) => Math.abs(x - b) < EPS);
    if (found !== undefined) {
      return { base: found, addon: addon as CableAddonKg };
    }
  }
  return { base: CABLE_BASE_START_KG, addon: 0 };
}

/**
 * スタック＋追加プレートを合計にし、ケーブルとして有効な値にスナップ。
 */
export function combineCableStackWeight(
  baseKg: number,
  addonKg: number,
  exerciseId?: string,
): number {
  const raw = Math.round((baseKg + addonKg) * 1000) / 1000;
  if (!isCableStackExercise(exerciseId)) return raw;
  return snapWeightToStepKg(raw, exerciseId);
}

function snapToNearestInList(w: number, list: readonly number[]): number {
  if (list.length === 0) return w;
  let best = list[0]!;
  let bestDiff = Math.abs(w - best);
  for (const x of list) {
    const d = Math.abs(w - x);
    if (d < bestDiff) {
      best = x;
      bestDiff = d;
    }
  }
  return best;
}

export function minWeightKgForExercise(exerciseId?: string): number {
  if (!exerciseId) return 0;
  if (isCableStackExercise(exerciseId)) return CABLE_BASE_START_KG;
  if (exerciseId === "bench_press" || exerciseId === "incline_bench_press") {
    return BENCH_PRESS_MIN_WEIGHT_KG;
  }
  if (isDumbbellExercise(exerciseId)) return DUMBBELL_MIN_WEIGHT_KG;
  return 0;
}

function createWeightOptionsForExercise(exerciseId?: string): readonly number[] {
  if (isCableStackExercise(exerciseId)) {
    return buildCableStackWeightOptions();
  }
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
  if (exerciseId === "bench_press" || exerciseId === "incline_bench_press") {
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
  if (isCableStackExercise(exerciseId)) {
    return snapToNearestInList(
      clamped,
      getWeightSelectOptionsForExercise(exerciseId),
    );
  }
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
