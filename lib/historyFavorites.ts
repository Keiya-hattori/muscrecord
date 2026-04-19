/** 種目別記録の「お気に入り」（設定で編集） */

export const DEFAULT_HISTORY_FAVORITE_IDS = [
  "bench_press",
  "pull_up",
  "squat",
  "lying_tricep_extension",
] as const;

const STORAGE_KEY = "muscrecord:historyPinnedIds";

/** null = 未設定 → デフォルト */
export function loadHistoryFavoriteIds(): string[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return null;
    return arr.filter((x): x is string => typeof x === "string");
  } catch {
    return null;
  }
}

const listeners = new Set<() => void>();

export function subscribeHistoryFavorites(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function emitHistoryFavorites(): void {
  listeners.forEach((fn) => fn());
}

export function saveHistoryFavoriteIds(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    emitHistoryFavorites();
  } catch {
    // ignore
  }
}

export function getEffectiveFavoriteIds(stored: string[] | null): string[] {
  if (stored === null) return [...DEFAULT_HISTORY_FAVORITE_IDS];
  return stored;
}
