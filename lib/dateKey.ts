/** ローカル日付キー YYYY-MM-DD */

export function localDateKeyFromMs(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayLocalDateKey(): string {
  return localDateKeyFromMs(Date.now());
}

/** 日付キーに日数を加算（ローカル暦） */
export function addDaysToDateKey(dateKey: string, deltaDays: number): string {
  const [y, mo, d] = dateKey.split("-").map(Number);
  const dt = new Date(y, mo - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  return localDateKeyFromMs(dt.getTime());
}

/** 表示用（例: 2026年4月19日） */
export function formatSessionDateJp(dateKey: string): string {
  const [y, mo, d] = dateKey.split("-").map(Number);
  if (!y || !mo || !d) return dateKey;
  return `${y}年${mo}月${d}日`;
}
