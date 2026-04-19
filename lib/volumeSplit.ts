import { getExerciseById } from "@/lib/exercises";

export type VolumeSplitMode = "ppl" | "six";

/** PPL: 胸・肩・三頭 = Push / 背・二頭 = Pull / 脚・体幹 = Legs */
export const PPL_KEYS = ["push", "pull", "legs"] as const;
export type PplKey = (typeof PPL_KEYS)[number];

/** 体幹は「脚」に含める（6区分に体幹がないため） */
export const SIX_KEYS = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "legs",
] as const;
export type SixKey = (typeof SIX_KEYS)[number];

export const PPL_LABELS: Record<PplKey, string> = {
  push: "プッシュ",
  pull: "プル",
  legs: "レッグス",
};

export const SIX_LABELS: Record<SixKey, string> = {
  chest: "胸",
  back: "背中",
  shoulders: "肩",
  biceps: "二頭",
  triceps: "三頭",
  legs: "脚",
};

export const PPL_COLORS: Record<PplKey, string> = {
  push: "#e11d48",
  pull: "#0284c7",
  legs: "#ca8a04",
};

export const SIX_COLORS: Record<SixKey, string> = {
  chest: "#e11d48",
  back: "#0284c7",
  shoulders: "#7c3aed",
  biceps: "#16a34a",
  triceps: "#ea580c",
  legs: "#ca8a04",
};

export function splitKeysForMode(mode: VolumeSplitMode): readonly string[] {
  return mode === "ppl" ? PPL_KEYS : SIX_KEYS;
}

export function splitKeyForExercise(
  exerciseId: string,
  mode: VolumeSplitMode,
): string | null {
  const ex = getExerciseById(exerciseId);
  if (!ex) return null;

  if (mode === "ppl") {
    switch (ex.category) {
      case "chest":
      case "shoulders":
        return "push";
      case "back":
        return "pull";
      case "legs":
      case "core":
        return "legs";
      case "arms":
        return ex.armFocus === "tricep" ? "push" : "pull";
      default:
        return null;
    }
  }

  switch (ex.category) {
    case "chest":
      return "chest";
    case "back":
      return "back";
    case "shoulders":
      return "shoulders";
    case "legs":
    case "core":
      return "legs";
    case "arms":
      return ex.armFocus === "tricep" ? "triceps" : "biceps";
    default:
      return null;
  }
}

export function emptySplitRow(
  mode: VolumeSplitMode,
): Record<string, number> {
  const o: Record<string, number> = {};
  for (const k of splitKeysForMode(mode)) {
    o[k] = 0;
  }
  return o;
}
