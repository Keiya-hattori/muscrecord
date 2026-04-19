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

/** 2.5kg刻み 0〜200（ネイティブ select のホイール操作向け） */
export const WEIGHT_SELECT_OPTIONS: readonly number[] = (() => {
  const o: number[] = [];
  for (let w = 0; w <= 200; w += 2.5) {
    o.push(Math.round(w * 10) / 10);
  }
  return o;
})();

export const REP_SELECT_OPTIONS: readonly number[] = Array.from(
  { length: 51 },
  (_, i) => i,
);

export function snapWeightToStepKg(w: number): number {
  const s = Math.round(w / 2.5) * 2.5;
  return Math.max(0, Math.min(200, Math.round(s * 10) / 10));
}
