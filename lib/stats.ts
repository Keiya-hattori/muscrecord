import { addDaysToDateKey, todayLocalDateKey } from "@/lib/dateKey";
import { db, getSetting } from "@/lib/db";
import {
  countsAsMainSet,
  effectiveSetVolumeFromRow,
} from "@/lib/setVolume";
import type { WorkoutSessionRow, WorkoutSetRow } from "@/lib/types";
import { parseUserProfileJson } from "@/lib/userProfile";

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
  /** 全セット行数 */
  setCount: number;
  /** ウォームアップ/ドロップ除く */
  mainSetCount: number;
};

async function loadBodyWeightKg(): Promise<number | null> {
  const rawProfile = await getSetting("userProfile");
  return parseUserProfileJson(rawProfile).bodyWeightKg;
}

export async function loadAllWorkoutsWithVolume(): Promise<WorkoutWithVolume[]> {
  const bodyWeightKg = await loadBodyWeightKg();
  const sessions = await db.workouts.orderBy("startedAt").reverse().toArray();
  const out: WorkoutWithVolume[] = [];
  for (const w of sessions) {
    const sets = await db.sets.where("workoutId").equals(w.id).toArray();
    const volume = sets.reduce(
      (a, s) => a + effectiveSetVolumeFromRow(s, bodyWeightKg),
      0,
    );
    const mainSetCount = sets.filter((s) => countsAsMainSet(s)).length;
    out.push({
      ...w,
      sets,
      volume,
      setCount: sets.length,
      mainSetCount,
    });
  }
  return out.filter((w) => w.sets.length > 0);
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
  const bodyWeightKg = await loadBodyWeightKg();
  const workouts = await loadAllWorkoutsWithVolume();
  const byEx = new Map<
    string,
    Map<string, { setCount: number; volumeKg: number }>
  >();

  for (const w of workouts) {
    const dk = w.sessionDate;
    for (const s of w.sets) {
      if (!countsAsMainSet(s)) continue;
      const inner =
        byEx.get(s.exerciseId) ??
        new Map<string, { setCount: number; volumeKg: number }>();
      const cur = inner.get(dk) ?? { setCount: 0, volumeKg: 0 };
      cur.setCount += 1;
      cur.volumeKg += effectiveSetVolumeFromRow(s, bodyWeightKg);
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

/** BIG3: 1回以上挙げた記録のうち、ログ上の最大重量（kg） */
export const BIG3_BENCH_ID = "bench_press";
export const BIG3_SQUAT_ID = "squat";
export const BIG3_DEADLIFT_ID = "deadlift";

function maxSetWeightForExercise(
  workouts: WorkoutWithVolume[],
  exerciseId: string,
): number {
  let m = 0;
  for (const w of workouts) {
    for (const s of w.sets) {
      if (s.exerciseId !== exerciseId) continue;
      if (s.reps < 1) continue;
      const kg = s.weightKg;
      if (Number.isFinite(kg) && kg > m) m = kg;
    }
  }
  return m;
}

/**
 * 日付境界より前 / 以降の種目別「セット最大重量（1回以上）」を集計し、
 * いずれかの種目で (以降 max) / (以前 max) >= minRatio なら true
 */
function anyExerciseMaxWeightGainAcrossCutoff(
  workouts: WorkoutWithVolume[],
  cutoffKey: string,
  minRatio: number,
): boolean {
  const before = new Map<string, number>();
  const after = new Map<string, number>();

  for (const w of workouts) {
    const dk = w.sessionDate;
    for (const s of w.sets) {
      if (s.reps < 1) continue;
      const kg = s.weightKg;
      if (!Number.isFinite(kg) || kg <= 0) continue;
      const ex = s.exerciseId;
      if (dk < cutoffKey) {
        before.set(ex, Math.max(before.get(ex) ?? 0, kg));
      } else {
        after.set(ex, Math.max(after.get(ex) ?? 0, kg));
      }
    }
  }

  for (const [ex, afterMax] of after) {
    const beforeMax = before.get(ex) ?? 0;
    if (beforeMax > 0 && afterMax >= beforeMax * minRatio) return true;
  }
  return false;
}

export type GlobalAggregates = {
  totalWorkouts: number;
  totalSets: number;
  totalVolume: number;
  uniqueExerciseCount: number;
  /** 1セッションあたりの平均ボリューム（kg） */
  avgVolumePerSession: number;
  /** 直近30日（今日含む）の合計ボリューム */
  volumeLast30Days: number;
  /** その前の30日間の合計ボリューム */
  volumePrev30Days: number;
  /** 直近30日のセッション数 */
  sessionsLast30Days: number;
  /** その前の30日のセッション数 */
  sessionsPrev30Days: number;
  /**
   * 直近30日 vs 前30日のボリューム増減率（%）。前30日が0なら null
   */
  volumeGrowth30dPct: number | null;
  maxWeightBenchPressKg: number;
  maxWeightSquatKg: number;
  maxWeightDeadliftKg: number;
  /**
   * 直近90日の種目別最大重量が、それより前の同種目の最大より
   * 20% or 50% 以上上がった種目が1つでもある
   */
  anyExerciseMaxWeightUp20Since90d: boolean;
  anyExerciseMaxWeightUp50Since90d: boolean;
};

function volumeAndSessionsInRange(
  workouts: WorkoutWithVolume[],
  fromInclusive: string,
  toInclusive: string,
): { volume: number; sessions: number } {
  let volume = 0;
  let sessions = 0;
  for (const w of workouts) {
    if (w.sessionDate >= fromInclusive && w.sessionDate <= toInclusive) {
      volume += w.volume;
      sessions++;
    }
  }
  return { volume, sessions };
}

export async function computeGlobalAggregates(): Promise<GlobalAggregates> {
  const workouts = await loadAllWorkoutsWithVolume();
  const totalWorkouts = workouts.length;
  const totalSets = workouts.reduce((a, w) => a + w.mainSetCount, 0);
  const totalVolume = workouts.reduce((a, w) => a + w.volume, 0);
  const ex = new Set<string>();
  for (const w of workouts) {
    for (const s of w.sets) {
      ex.add(s.exerciseId);
    }
  }

  const today = todayLocalDateKey();
  const fromLast30 = addDaysToDateKey(today, -29);
  const toPrev30Start = addDaysToDateKey(today, -30);
  const fromPrev30 = addDaysToDateKey(today, -59);

  const last30 = volumeAndSessionsInRange(workouts, fromLast30, today);
  const prev30 = volumeAndSessionsInRange(workouts, fromPrev30, toPrev30Start);

  const volumeGrowth30dPct =
    prev30.volume > 0
      ? ((last30.volume - prev30.volume) / prev30.volume) * 100
      : null;

  const avgVolumePerSession =
    totalWorkouts > 0 ? totalVolume / totalWorkouts : 0;

  const maxWeightBenchPressKg = maxSetWeightForExercise(
    workouts,
    BIG3_BENCH_ID,
  );
  const maxWeightSquatKg = maxSetWeightForExercise(
    workouts,
    BIG3_SQUAT_ID,
  );
  const maxWeightDeadliftKg = maxSetWeightForExercise(
    workouts,
    BIG3_DEADLIFT_ID,
  );

  const cut90 = addDaysToDateKey(today, -90);
  const anyExerciseMaxWeightUp50Since90d =
    anyExerciseMaxWeightGainAcrossCutoff(workouts, cut90, 1.5);
  const anyExerciseMaxWeightUp20Since90d =
    anyExerciseMaxWeightUp50Since90d ||
    anyExerciseMaxWeightGainAcrossCutoff(workouts, cut90, 1.2);

  return {
    totalWorkouts,
    totalSets,
    totalVolume,
    uniqueExerciseCount: ex.size,
    avgVolumePerSession,
    volumeLast30Days: last30.volume,
    volumePrev30Days: prev30.volume,
    sessionsLast30Days: last30.sessions,
    sessionsPrev30Days: prev30.sessions,
    volumeGrowth30dPct,
    maxWeightBenchPressKg,
    maxWeightSquatKg,
    maxWeightDeadliftKg,
    anyExerciseMaxWeightUp20Since90d,
    anyExerciseMaxWeightUp50Since90d,
  };
}

/** ホーム用: BIG3 最大（記録ゼロなら 0） */
export async function getBig3MaxKg(): Promise<{
  bench: number;
  squat: number;
  dead: number;
}> {
  const workouts = await loadAllWorkoutsWithVolume();
  return {
    bench: maxSetWeightForExercise(workouts, BIG3_BENCH_ID),
    squat: maxSetWeightForExercise(workouts, BIG3_SQUAT_ID),
    dead: maxSetWeightForExercise(workouts, BIG3_DEADLIFT_ID),
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
    const key = w.sessionDate;
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
