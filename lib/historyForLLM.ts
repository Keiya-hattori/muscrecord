import { getSetsForWorkout, listRecentWorkouts } from "@/lib/db";
import { getExerciseById } from "@/lib/exercises";
export type SessionSummary = {
  startedAt: number;
  /** トレーニング日 YYYY-MM-DD */
  sessionDate: string;
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
      sessionDate: s.sessionDate,
      startedAtIso: new Date(s.startedAt).toISOString(),
      daysAgo: daysBetween(s.startedAt, now),
      exercises,
    });
  }

  return out;
}
