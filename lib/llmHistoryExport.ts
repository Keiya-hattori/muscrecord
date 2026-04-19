import { db } from "@/lib/db";
import { addDaysToDateKey, todayLocalDateKey } from "@/lib/dateKey";
import { getExerciseById } from "@/lib/exercises";
import type { WorkoutSetRow, WorkoutSessionRow } from "@/lib/types";

export type LlmHistoryRange = "all" | "last30days";

type LlmExerciseSummary = {
  exerciseId: string;
  exerciseName: string;
  totalSets: number;
  totalReps: number;
  totalVolumeKg: number;
  maxWeightKg: number;
  sets: {
    order: number;
    weightKg: number;
    reps: number;
  }[];
};

type LlmSessionSummary = {
  workoutId: string;
  sessionDate: string;
  startedAtIso: string;
  note: string;
  totalSets: number;
  totalReps: number;
  totalVolumeKg: number;
  exercises: LlmExerciseSummary[];
};

export type LlmTrainingHistoryPayload = {
  format: "muscrecord-llm-history.v1";
  exportedAtIso: string;
  range: {
    mode: LlmHistoryRange;
    fromDate: string | null;
    toDate: string | null;
    description: string;
  };
  stats: {
    sessionCount: number;
    setCount: number;
    totalReps: number;
    totalVolumeKg: number;
    distinctExerciseCount: number;
  };
  sessions: LlmSessionSummary[];
  promptHintJa: string;
};

function rangeFilterFor(mode: LlmHistoryRange): {
  fromDate: string | null;
  toDate: string | null;
  description: string;
} {
  if (mode === "last30days") {
    const toDate = todayLocalDateKey();
    const fromDate = addDaysToDateKey(toDate, -30);
    return {
      fromDate,
      toDate,
      description: "直近30日（sessionDateベース）",
    };
  }
  return {
    fromDate: null,
    toDate: null,
    description: "全期間",
  };
}

function inRange(
  workout: WorkoutSessionRow,
  fromDate: string | null,
  toDate: string | null,
): boolean {
  if (fromDate && workout.sessionDate < fromDate) return false;
  if (toDate && workout.sessionDate > toDate) return false;
  return true;
}

function summarizeSession(workout: WorkoutSessionRow, sets: WorkoutSetRow[]): LlmSessionSummary {
  const byExercise = new Map<string, WorkoutSetRow[]>();
  for (const row of sets) {
    const list = byExercise.get(row.exerciseId) ?? [];
    list.push(row);
    byExercise.set(row.exerciseId, list);
  }

  const exercises: LlmExerciseSummary[] = [];
  for (const [exerciseId, rows] of byExercise.entries()) {
    rows.sort((a, b) => a.order - b.order);
    const totalSets = rows.length;
    const totalReps = rows.reduce((sum, r) => sum + r.reps, 0);
    const totalVolumeKg = rows.reduce((sum, r) => sum + r.weightKg * r.reps, 0);
    const maxWeightKg = rows.reduce(
      (max, r) => (r.weightKg > max ? r.weightKg : max),
      0,
    );
    exercises.push({
      exerciseId,
      exerciseName: getExerciseById(exerciseId)?.name ?? exerciseId,
      totalSets,
      totalReps,
      totalVolumeKg: Math.round(totalVolumeKg * 10) / 10,
      maxWeightKg,
      sets: rows.map((r) => ({
        order: r.order,
        weightKg: r.weightKg,
        reps: r.reps,
      })),
    });
  }

  exercises.sort((a, b) => b.totalVolumeKg - a.totalVolumeKg);
  const totalReps = sets.reduce((sum, r) => sum + r.reps, 0);
  const totalVolumeKg = sets.reduce((sum, r) => sum + r.weightKg * r.reps, 0);

  return {
    workoutId: workout.id,
    sessionDate: workout.sessionDate,
    startedAtIso: new Date(workout.startedAt).toISOString(),
    note: workout.note ?? "",
    totalSets: sets.length,
    totalReps,
    totalVolumeKg: Math.round(totalVolumeKg * 10) / 10,
    exercises,
  };
}

export async function buildTrainingHistoryForLlm(
  mode: LlmHistoryRange,
): Promise<LlmTrainingHistoryPayload> {
  const [{ fromDate, toDate, description }, workouts, sets] = await Promise.all([
    Promise.resolve(rangeFilterFor(mode)),
    db.workouts.toArray(),
    db.sets.toArray(),
  ]);

  const setsByWorkout = new Map<string, WorkoutSetRow[]>();
  for (const row of sets) {
    const list = setsByWorkout.get(row.workoutId) ?? [];
    list.push(row);
    setsByWorkout.set(row.workoutId, list);
  }

  const sessions = workouts
    .filter((w) => inRange(w, fromDate, toDate))
    .map((w) => {
      const rows = setsByWorkout.get(w.id) ?? [];
      return summarizeSession(w, rows);
    })
    .filter((s) => s.totalSets > 0)
    .sort((a, b) =>
      a.sessionDate === b.sessionDate
        ? a.startedAtIso.localeCompare(b.startedAtIso)
        : a.sessionDate.localeCompare(b.sessionDate),
    );

  const distinctExerciseIds = new Set<string>();
  let setCount = 0;
  let totalReps = 0;
  let totalVolumeKg = 0;
  for (const s of sessions) {
    setCount += s.totalSets;
    totalReps += s.totalReps;
    totalVolumeKg += s.totalVolumeKg;
    for (const ex of s.exercises) distinctExerciseIds.add(ex.exerciseId);
  }

  return {
    format: "muscrecord-llm-history.v1",
    exportedAtIso: new Date().toISOString(),
    range: {
      mode,
      fromDate,
      toDate,
      description,
    },
    stats: {
      sessionCount: sessions.length,
      setCount,
      totalReps,
      totalVolumeKg: Math.round(totalVolumeKg * 10) / 10,
      distinctExerciseCount: distinctExerciseIds.size,
    },
    sessions,
    promptHintJa:
      "このJSONをもとに、種目ごとの進捗・停滞・次回メニュー案を日本語で提案してください。過負荷の原則と疲労管理を考慮してください。",
  };
}

export async function exportTrainingHistoryForLlmJson(
  mode: LlmHistoryRange,
): Promise<{ json: string; sessionCount: number }> {
  const payload = await buildTrainingHistoryForLlm(mode);
  return {
    json: JSON.stringify(payload, null, 2),
    sessionCount: payload.stats.sessionCount,
  };
}
