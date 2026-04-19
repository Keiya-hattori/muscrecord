import { db } from "@/lib/db";
import type { WorkoutSessionRow, WorkoutSetRow } from "@/lib/types";

/** ローカル日付キー YYYY-MM-DD */
export function toDateKey(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDateLabel(dateKey: string): string {
  const [, mo, da] = dateKey.split("-").map(Number);
  return `${mo}月${da}日`;
}

/** 日付を1通りに表示（種目別記録などで重複表示を避ける） */
export function formatDateFullJa(dateKey: string): string {
  const [y, mo, da] = dateKey.split("-").map(Number);
  return `${y}年${mo}月${da}日`;
}

export type WorkoutWithVolume = WorkoutSessionRow & {
  sets: WorkoutSetRow[];
  volume: number;
  setCount: number;
};

export async function loadAllWorkoutsWithVolume(): Promise<WorkoutWithVolume[]> {
  const sessions = await db.workouts.orderBy("startedAt").reverse().toArray();
  const out: WorkoutWithVolume[] = [];
  for (const w of sessions) {
    const sets = await db.sets.where("workoutId").equals(w.id).toArray();
    const volume = sets.reduce((a, s) => a + s.weightKg * s.reps, 0);
    out.push({
      ...w,
      sets,
      volume,
      setCount: sets.length,
    });
  }
  return out;
}

/** 種目ごとに、その日付のセットとボリューム（同一日に複数セッションがあれば合算） */
export type ExerciseDayRow = {
  dateKey: string;
  dateLabel: string;
  setCount: number;
  /** 総ボリューム（kg）= Σ(重量×回数) */
  volumeKg: number;
  /** 当種目で「その日」のボリュームが過去最大とタイ（かつ0より大きい） */
  isPersonalBestVolume: boolean;
};

export type ExerciseHistoryGroup = {
  exerciseId: string;
  /** 新しい日付順 */
  days: ExerciseDayRow[];
};

/** 種目別に、日付・セット数・総ボリュームの一覧（新しい日付順）。種目の並びはトレーニング日数が多い順 */
export async function groupHistoryByExercise(): Promise<ExerciseHistoryGroup[]> {
  const workouts = await loadAllWorkoutsWithVolume();
  const byEx = new Map<
    string,
    Map<string, { setCount: number; volumeKg: number }>
  >();

  for (const w of workouts) {
    const dk = toDateKey(w.startedAt);
    for (const s of w.sets) {
      const inner =
        byEx.get(s.exerciseId) ??
        new Map<string, { setCount: number; volumeKg: number }>();
      const cur = inner.get(dk) ?? { setCount: 0, volumeKg: 0 };
      cur.setCount += 1;
      cur.volumeKg += s.weightKg * s.reps;
      inner.set(dk, cur);
      byEx.set(s.exerciseId, inner);
    }
  }

  const result: ExerciseHistoryGroup[] = [];
  for (const [exerciseId, dateMap] of byEx.entries()) {
    const sortedEntries = [...dateMap.entries()].sort((a, b) =>
      a[0] < b[0] ? 1 : -1,
    );
    const maxVol = Math.max(
      0,
      ...sortedEntries.map(([, agg]) => agg.volumeKg),
    );

    const days: ExerciseDayRow[] = sortedEntries.map(([dateKey, agg]) => ({
      dateKey,
      dateLabel: formatDateLabel(dateKey),
      setCount: agg.setCount,
      volumeKg: agg.volumeKg,
      isPersonalBestVolume: agg.volumeKg > 0 && agg.volumeKg === maxVol,
    }));
    result.push({ exerciseId, days });
  }

  /** トレーニング頻度（記録した日数）が高い順 → 総ボリューム多い順 */
  result.sort((a, b) => {
    const fa = a.days.length;
    const fb = b.days.length;
    if (fa !== fb) return fb - fa;
    const va = a.days.reduce((s, d) => s + d.volumeKg, 0);
    const vb = b.days.reduce((s, d) => s + d.volumeKg, 0);
    if (va !== vb) return vb - va;
    return a.exerciseId.localeCompare(b.exerciseId);
  });

  return result;
}

export type GlobalAggregates = {
  totalWorkouts: number;
  totalSets: number;
  totalVolume: number;
  uniqueExerciseCount: number;
};

export async function computeGlobalAggregates(): Promise<GlobalAggregates> {
  const workouts = await loadAllWorkoutsWithVolume();
  const totalWorkouts = workouts.length;
  const totalSets = workouts.reduce((a, w) => a + w.setCount, 0);
  const totalVolume = workouts.reduce((a, w) => a + w.volume, 0);
  const ex = new Set<string>();
  for (const w of workouts) {
    for (const s of w.sets) {
      ex.add(s.exerciseId);
    }
  }

  return {
    totalWorkouts,
    totalSets,
    totalVolume,
    uniqueExerciseCount: ex.size,
  };
}

/** 直近 numWeeks 週の週次ボリューム（週の開始は日曜始まり） */
export async function weeklyVolumeSeries(numWeeks: number): Promise<
  { weekLabel: string; volume: number; weekStartKey: string }[]
> {
  const workouts = await loadAllWorkoutsWithVolume();

  function startOfWeekSunday(d: Date): Date {
    const x = new Date(d);
    const day = x.getDay();
    x.setDate(x.getDate() - day);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  const today = new Date();
  const thisWeekStart = startOfWeekSunday(today);
  const buckets = new Map<string, number>();

  for (let w = numWeeks - 1; w >= 0; w--) {
    const d = new Date(thisWeekStart);
    d.setDate(d.getDate() - w * 7);
    const key = toDateKey(d.getTime());
    buckets.set(key, 0);
  }

  for (const wo of workouts) {
    const d = new Date(wo.startedAt);
    const sow = startOfWeekSunday(d);
    const key = toDateKey(sow.getTime());
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + wo.volume);
    }
  }

  const ordered = [...buckets.entries()].sort((a, b) =>
    a[0] < b[0] ? -1 : 1,
  );
  return ordered.map(([weekStartKey, volume]) => {
    const [, mo, da] = weekStartKey.split("-").map(Number);
    return {
      weekLabel: `${mo}/${da}〜`,
      volume: Math.round(volume),
      weekStartKey,
    };
  });
}

/** 直近 numDays 日の日次ボリューム */
export async function dailyVolumeSeries(numDays: number): Promise<
  { dateKey: string; label: string; volume: number }[]
> {
  const workouts = await loadAllWorkoutsWithVolume();
  const byDay = new Map<string, number>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = toDateKey(d.getTime());
    byDay.set(key, 0);
  }

  for (const w of workouts) {
    const key = toDateKey(w.startedAt);
    if (byDay.has(key)) {
      byDay.set(key, (byDay.get(key) ?? 0) + w.volume);
    }
  }

  return [...byDay.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([dateKey, volume]) => ({
      dateKey,
      label: formatDateLabel(dateKey),
      volume: Math.round(volume),
    }));
}
