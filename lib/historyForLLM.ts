import { getSetsForWorkout, listRecentWorkouts } from "@/lib/db";
import { getExerciseById } from "@/lib/exercises";
import { loadAllWorkoutsWithVolume } from "@/lib/stats";
export type SessionSummary = {
  startedAt: number;
  startedAtIso: string;
  daysAgo: number;
  exercises: {
    exerciseId: string;
    name: string;
    sets: { weightKg: number; reps: number }[];
    volume: number;
  }[];
};

function daysBetween(fromMs: number, toMs: number): number {
  return Math.floor((toMs - fromMs) / (24 * 60 * 60 * 1000));
}

export async function buildRecentSessionSummaries(
  limit: number,
): Promise<SessionSummary[]> {
  const sessions = await listRecentWorkouts(limit);
  const now = Date.now();
  const out: SessionSummary[] = [];

  for (const s of sessions) {
    const sets = await getSetsForWorkout(s.id);
    const byExercise = new Map<
      string,
      { weightKg: number; reps: number }[]
    >();

    for (const row of sets) {
      const list = byExercise.get(row.exerciseId) ?? [];
      list.push({ weightKg: row.weightKg, reps: row.reps });
      byExercise.set(row.exerciseId, list);
    }

    const exercises = [...byExercise.entries()].map(([exerciseId, setList]) => {
      const meta = getExerciseById(exerciseId);
      const volume = setList.reduce((a, x) => a + x.weightKg * x.reps, 0);
      return {
        exerciseId,
        name: meta?.name ?? exerciseId,
        sets: setList,
        volume,
      };
    });

    out.push({
      startedAt: s.startedAt,
      startedAtIso: new Date(s.startedAt).toISOString(),
      daysAgo: daysBetween(s.startedAt, now),
      exercises,
    });
  }

  return out;
}

/** 種目ごとの「直近その種目を記録したセッション」のセット一覧（提案精度用） */
export type ExerciseLatestSnapshot = {
  exerciseId: string;
  name: string;
  sessionStartedAtIso: string;
  daysAgo: number;
  sets: { weightKg: number; reps: number }[];
};

export async function buildPerExerciseLatestSnapshots(): Promise<
  ExerciseLatestSnapshot[]
> {
  const workouts = await loadAllWorkoutsWithVolume();
  const now = Date.now();
  const seen = new Map<string, (typeof workouts)[0]>();

  for (const w of workouts) {
    const ids = new Set(w.sets.map((s) => s.exerciseId));
    for (const id of ids) {
      if (!seen.has(id)) seen.set(id, w);
    }
  }

  const between = (fromMs: number) =>
    Math.floor((now - fromMs) / (24 * 60 * 60 * 1000));

  return [...seen.entries()]
    .map(([exerciseId, w]) => {
      const subs = w.sets.filter((s) => s.exerciseId === exerciseId);
      const sorted = [...subs].sort((a, b) => a.order - b.order);
      return {
        exerciseId,
        name: getExerciseById(exerciseId)?.name ?? exerciseId,
        sessionStartedAtIso: new Date(w.startedAt).toISOString(),
        daysAgo: between(w.startedAt),
        sets: sorted.map((s) => ({
          weightKg: s.weightKg,
          reps: s.reps,
        })),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "ja"));
}
