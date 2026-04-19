import type { ExerciseCategory } from "@/lib/types";
import {
  todayContextSchema,
  userProfileSchema,
  type TodayContext,
  type UserProfile,
} from "@/lib/userProfile";

export const LS_TODAY_CONTEXT = "muscrecord:todayContext";
export const LS_USER_PROFILE_FORM = "muscrecord:userProfileForm";
export const LS_EXERCISE_PICKER = "muscrecord:exercisePicker";

const CATEGORY_SET = new Set<string>([
  "all",
  "chest",
  "back",
  "legs",
  "shoulders",
  "arms",
  "core",
]);

export type ExercisePickerPersist = {
  query: string;
  category: ExerciseCategory | "all";
};

export function workoutSelectedStorageKey(workoutId: string): string {
  return `muscrecord:workoutSelected:${workoutId}`;
}

export function loadTodayContextFromStorage(): TodayContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_TODAY_CONTEXT);
    if (!raw) return null;
    const r = todayContextSchema.safeParse(JSON.parse(raw) as unknown);
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

export function saveTodayContextToStorage(t: TodayContext): void {
  try {
    localStorage.setItem(LS_TODAY_CONTEXT, JSON.stringify(t));
  } catch {
    // 容量制限等
  }
}

export function loadUserProfileFormFromStorage(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_USER_PROFILE_FORM);
    if (!raw) return null;
    const r = userProfileSchema.safeParse(JSON.parse(raw) as unknown);
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

export function saveUserProfileFormToStorage(p: UserProfile): void {
  try {
    localStorage.setItem(LS_USER_PROFILE_FORM, JSON.stringify(p));
  } catch {
    // 容量制限等
  }
}

function parseExerciseCategoryOrAll(
  v: unknown,
): ExerciseCategory | "all" | null {
  if (v === "all") return "all";
  if (typeof v === "string" && CATEGORY_SET.has(v) && v !== "all") {
    return v as ExerciseCategory;
  }
  return null;
}

export function loadExercisePickerFromStorage(): ExercisePickerPersist | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_EXERCISE_PICKER);
    if (!raw) return null;
    const j = JSON.parse(raw) as Record<string, unknown>;
    const query = typeof j.query === "string" ? j.query : "";
    const cat = parseExerciseCategoryOrAll(j.category);
    if (!cat) return { query, category: "all" };
    return { query, category: cat };
  } catch {
    return null;
  }
}

export function saveExercisePickerToStorage(s: ExercisePickerPersist): void {
  try {
    localStorage.setItem(LS_EXERCISE_PICKER, JSON.stringify(s));
  } catch {
    // 容量制限等
  }
}
