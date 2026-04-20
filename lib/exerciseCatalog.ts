import raw from "@/lib/exercises.json";
import type { ExerciseCategory, ExerciseMaster } from "@/lib/types";

const BUILTIN = raw as ExerciseMaster[];

const STORAGE_KEY = "muscrecord:exerciseCatalog";

export type ExerciseCatalogState = {
  disabledIds: string[];
  custom: ExerciseMaster[];
  defaultWeightKgById: Record<string, number>;
};

const defaultState = (): ExerciseCatalogState => ({
  disabledIds: [],
  custom: [],
  defaultWeightKgById: {},
});

const listeners = new Set<() => void>();

export function subscribeExerciseCatalog(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function emitExerciseCatalog(): void {
  listeners.forEach((fn) => fn());
}

function parseState(raw: string | null): ExerciseCatalogState {
  if (!raw) return defaultState();
  try {
    const j = JSON.parse(raw) as unknown;
    if (!j || typeof j !== "object") return defaultState();
    const o = j as Record<string, unknown>;
    const disabledIds = Array.isArray(o.disabledIds)
      ? o.disabledIds.filter((x): x is string => typeof x === "string")
      : [];
    const custom: ExerciseMaster[] = [];
    if (Array.isArray(o.custom)) {
      for (const item of o.custom) {
        if (!item || typeof item !== "object") continue;
        const r = item as Record<string, unknown>;
        if (
          typeof r.id === "string" &&
          typeof r.name === "string" &&
          typeof r.category === "string" &&
          typeof r.imagePath === "string"
        ) {
          const ex: ExerciseMaster = {
            id: r.id,
            name: r.name,
            category: r.category as ExerciseCategory,
            imagePath: r.imagePath,
          };
          if (r.armFocus === "bicep" || r.armFocus === "tricep") {
            ex.armFocus = r.armFocus;
          }
          custom.push(ex);
        }
      }
    }
    const defaultWeightKgById: Record<string, number> = {};
    if (
      o.defaultWeightKgById &&
      typeof o.defaultWeightKgById === "object" &&
      !Array.isArray(o.defaultWeightKgById)
    ) {
      for (const [id, value] of Object.entries(o.defaultWeightKgById)) {
        if (typeof id !== "string") continue;
        if (typeof value !== "number" || !Number.isFinite(value)) continue;
        defaultWeightKgById[id] = value;
      }
    }
    return { disabledIds, custom, defaultWeightKgById };
  } catch {
    return defaultState();
  }
}

export function loadExerciseCatalog(): ExerciseCatalogState {
  if (typeof window === "undefined") return defaultState();
  return parseState(localStorage.getItem(STORAGE_KEY));
}

export function saveExerciseCatalog(state: ExerciseCatalogState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    emitExerciseCatalog();
  } catch {
    // 容量制限等
  }
}

export function notifyExerciseCatalogChanged(): void {
  emitExerciseCatalog();
}

const CATEGORY_PLACEHOLDER: Record<ExerciseCategory, string> = {
  chest: "/exercises/bench_press.svg",
  back: "/exercises/lat_pulldown.svg",
  legs: "/exercises/squat.svg",
  shoulders: "/exercises/ohp.svg",
  arms: "/exercises/bicep_curl.svg",
  core: "/exercises/plank.svg",
};

export function placeholderImageForCategory(cat: ExerciseCategory): string {
  return CATEGORY_PLACEHOLDER[cat];
}

/** マスタ＋カスタム。履歴表示用（非表示種目も名前解決できる） */
export function resolveExerciseById(id: string): ExerciseMaster | undefined {
  const b = BUILTIN.find((e) => e.id === id);
  if (b) return b;
  if (typeof window === "undefined") return undefined;
  return loadExerciseCatalog().custom.find((c) => c.id === id);
}

/** 記録・ピッカー用（非表示は除外） */
export function getRecordableExercises(): ExerciseMaster[] {
  if (typeof window === "undefined") {
    return BUILTIN;
  }
  const s = loadExerciseCatalog();
  const visible = BUILTIN.filter((e) => !s.disabledIds.includes(e.id));
  const customVis = s.custom.filter((c) => !s.disabledIds.includes(c.id));
  return [...visible, ...customVis];
}

export function createCustomExercise(params: {
  name: string;
  category: ExerciseCategory;
  armFocus?: "bicep" | "tricep";
}): ExerciseMaster {
  const id = `custom_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const imagePath = placeholderImageForCategory(params.category);
  const base: ExerciseMaster = {
    id,
    name: params.name.trim(),
    category: params.category,
    imagePath,
  };
  if (params.category === "arms" && params.armFocus) {
    base.armFocus = params.armFocus;
  }
  return base;
}
