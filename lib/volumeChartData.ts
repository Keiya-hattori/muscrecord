import { getSetting } from "@/lib/db";
import { effectiveSetVolumeKg } from "@/lib/effectiveVolume";
import { loadAllWorkoutsWithVolume, toDateKey } from "@/lib/stats";
import { parseUserProfileJson } from "@/lib/userProfile";
import {
  emptySplitRow,
  splitKeyForExercise,
  type VolumeSplitMode,
} from "@/lib/volumeSplit";

export type VolumeChartPeriod = "d7" | "d30" | "w9" | "m6" | "all";

/** Recharts 用（日付・ラベル + 部位ごとの kg） */
export type DailyVolumeSplitRow = Record<string, string | number>;

export type CumulativeVolumeSplitRow = Record<string, string | number>;

export type VolumeChartPayload =
  | {
      kind: "daily";
      rows: DailyVolumeSplitRow[];
      /** 説明用 */
      subtitle: string;
    }
  | {
      kind: "cumulative";
      rows: CumulativeVolumeSplitRow[];
      subtitle: string;
    };

function startOfWeekSunday(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

function lastNDaysDateKeys(n: number): string[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    keys.push(toDateKey(d.getTime()));
  }
  return keys;
}

function lastNWeekStartsSunday(n: number): string[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thisWeek = startOfWeekSunday(today);
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(thisWeek);
    d.setDate(d.getDate() - i * 7);
    keys.push(toDateKey(d.getTime()));
  }
  return keys;
}

function weekStartSundayFromSessionDate(sessionDate: string): string {
  const [y, mo, da] = sessionDate.split("-").map(Number);
  const d = new Date(y, mo - 1, da);
  return toDateKey(startOfWeekSunday(d).getTime());
}

function monthKeyFromSessionDate(sessionDate: string): string {
  return sessionDate.slice(0, 7);
}

function lastNCalendarMonthKeys(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    out.push(`${y}-${String(m).padStart(2, "0")}`);
  }
  return out;
}

function enumerateMonthsInclusive(fromYm: string, toYm: string): string[] {
  const [fy, fm] = fromYm.split("-").map(Number);
  const [ty, tm] = toYm.split("-").map(Number);
  const out: string[] = [];
  let y = fy;
  let m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

function formatYmLabel(ym: string): string {
  const [y, mo] = ym.split("-").map(Number);
  return `${y}年${mo}月`;
}

export async function loadVolumeChartSeries(
  period: VolumeChartPeriod,
  mode: VolumeSplitMode,
): Promise<VolumeChartPayload> {
  const [workouts, rawProfile] = await Promise.all([
    loadAllWorkoutsWithVolume(),
    getSetting("userProfile"),
  ]);
  const bodyW = parseUserProfileJson(rawProfile).bodyWeightKg;

  const addSetsToRow = (
    row: Record<string, number>,
    w: (typeof workouts)[0],
  ) => {
    for (const s of w.sets) {
      const sk = splitKeyForExercise(s.exerciseId, mode);
      if (!sk) continue;
      const v = effectiveSetVolumeKg(
        s.exerciseId,
        s.weightKg,
        s.reps,
        bodyW,
      );
      row[sk] = (row[sk] ?? 0) + v;
    }
  };

  if (period === "d7" || period === "d30") {
    const n = period === "d7" ? 7 : 30;
    const dayKeys = lastNDaysDateKeys(n);
    const inRange = new Set(dayKeys);
    const perDay = new Map<string, Record<string, number>>();
    for (const dk of dayKeys) {
      perDay.set(dk, { ...emptySplitRow(mode) });
    }
    for (const w of workouts) {
      if (!inRange.has(w.sessionDate)) continue;
      const row = perDay.get(w.sessionDate);
      if (!row) continue;
      addSetsToRow(row, w);
    }
    const rows: DailyVolumeSplitRow[] = dayKeys.map((dk) => {
      const r = perDay.get(dk)!;
      const [, mo, da] = dk.split("-").map(Number);
      return {
        dateKey: dk,
        label: `${mo}/${da}`,
        ...r,
      };
    });
    return {
      kind: "daily",
      rows,
      subtitle: `各日の部位別ボリューム（過去${n}日・折れ線）`,
    };
  }

  if (period === "w9") {
    const weekKeys = lastNWeekStartsSunday(9);
    const allowed = new Set(weekKeys);
    const perWeek = new Map<string, Record<string, number>>();
    for (const wk of weekKeys) {
      perWeek.set(wk, { ...emptySplitRow(mode) });
    }
    for (const w of workouts) {
      const bk = weekStartSundayFromSessionDate(w.sessionDate);
      if (!allowed.has(bk)) continue;
      const row = perWeek.get(bk);
      if (!row) continue;
      addSetsToRow(row, w);
    }
    const running = { ...emptySplitRow(mode) };
    const keys = Object.keys(running);
    const rows: CumulativeVolumeSplitRow[] = weekKeys.map((wk) => {
      const chunk = perWeek.get(wk)!;
      for (const k of keys) {
        running[k] = (running[k] ?? 0) + (chunk[k] ?? 0);
      }
      const [, mo, da] = wk.split("-").map(Number);
      return {
        bucketKey: wk,
        label: `${mo}/${da}〜`,
        ...Object.fromEntries(keys.map((k) => [k, running[k]])),
      } as CumulativeVolumeSplitRow;
    });
    return {
      kind: "cumulative",
      rows,
      subtitle: "週ごとの累積ボリューム（直近9週・積み上げ棒）",
    };
  }

  if (period === "m6") {
    const monthKeys = lastNCalendarMonthKeys(6);
    const allowed = new Set(monthKeys);
    const perMonth = new Map<string, Record<string, number>>();
    for (const mk of monthKeys) {
      perMonth.set(mk, { ...emptySplitRow(mode) });
    }
    for (const w of workouts) {
      const mk = monthKeyFromSessionDate(w.sessionDate);
      if (!allowed.has(mk)) continue;
      const row = perMonth.get(mk);
      if (!row) continue;
      addSetsToRow(row, w);
    }
    const running = { ...emptySplitRow(mode) };
    const keys = Object.keys(running);
    const rows: CumulativeVolumeSplitRow[] = monthKeys.map((mk) => {
      const chunk = perMonth.get(mk)!;
      for (const k of keys) {
        running[k] = (running[k] ?? 0) + (chunk[k] ?? 0);
      }
      return {
        bucketKey: mk,
        label: formatYmLabel(mk),
        ...Object.fromEntries(keys.map((k) => [k, running[k]])),
      } as CumulativeVolumeSplitRow;
    });
    return {
      kind: "cumulative",
      rows,
      subtitle: "月ごとの累積ボリューム（直近6か月・積み上げ棒）",
    };
  }

  // all — 最初の記録月〜今月までを月次で累積
  const sessionMonths = workouts.map((w) => monthKeyFromSessionDate(w.sessionDate));
  if (sessionMonths.length === 0) {
    return {
      kind: "cumulative",
      rows: [],
      subtitle: "累計（月次・累積）",
    };
  }
  const sortedMonths = [...new Set(sessionMonths)].sort();
  const fromYm = sortedMonths[0];
  const now = new Date();
  const toYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthKeysAll = enumerateMonthsInclusive(fromYm, toYm);
  const perMonth = new Map<string, Record<string, number>>();
  for (const mk of monthKeysAll) {
    perMonth.set(mk, { ...emptySplitRow(mode) });
  }
  for (const w of workouts) {
    const mk = monthKeyFromSessionDate(w.sessionDate);
    const row = perMonth.get(mk);
    if (!row) continue;
    addSetsToRow(row, w);
  }
  const running = { ...emptySplitRow(mode) };
  const keys = Object.keys(running);
  const rows: CumulativeVolumeSplitRow[] = monthKeysAll.map((mk) => {
    const chunk = perMonth.get(mk)!;
    for (const k of keys) {
      running[k] = (running[k] ?? 0) + (chunk[k] ?? 0);
    }
    return {
      bucketKey: mk,
      label: formatYmLabel(mk),
      ...Object.fromEntries(keys.map((k) => [k, running[k]])),
    } as CumulativeVolumeSplitRow;
  });
  return {
    kind: "cumulative",
    rows,
    subtitle: "月ごとの累積ボリューム（全期間・積み上げ棒）",
  };
}
