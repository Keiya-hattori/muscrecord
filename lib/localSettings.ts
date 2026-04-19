/**
 * アプリ設定の保存先（localStorage）。
 * 記録データ（IndexedDB）とは分離する。
 */
const KEY_PREFIX = "muscrecord:setting:";

export function getLocalSetting(key: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const v = localStorage.getItem(KEY_PREFIX + key);
    return v === null ? undefined : v;
  } catch {
    return undefined;
  }
}

export function setLocalSetting(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY_PREFIX + key, value);
  } catch {
    // 容量制限など
  }
}

export function listLocalSettingKeys(): string[] {
  if (typeof window === "undefined") return [];
  const out: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(KEY_PREFIX)) {
        out.push(k.slice(KEY_PREFIX.length));
      }
    }
  } catch {
    /* ignore */
  }
  return out.sort();
}

/** インポート前に設定キーをすべて削除 */
export function clearAllLocalSettings(): void {
  if (typeof window === "undefined") return;
  for (const key of listLocalSettingKeys()) {
    try {
      localStorage.removeItem(KEY_PREFIX + key);
    } catch {
      /* ignore */
    }
  }
}
