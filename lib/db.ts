import Dexie, { type EntityTable } from "dexie";
import type { WorkoutSessionRow, WorkoutSetRow } from "@/lib/types";
import { localDateKeyFromMs, todayLocalDateKey } from "@/lib/dateKey";

class MuscleDB extends Dexie {
  workouts!: EntityTable<WorkoutSessionRow, "id">;
  sets!: EntityTable<WorkoutSetRow, "id">;
  settings!: EntityTable<{ key: string; value: string }, "key">;

  constructor() {
    super("muscle-pwa-db");
    this.version(1).stores({
      workouts: "id, startedAt",
      sets: "id, workoutId, exerciseId",
      settings: "key",
    });
    this.version(2)
      .stores({
        workouts: "id, startedAt, sessionDate",
        sets: "id, workoutId, exerciseId",
        settings: "key",
      })
      .upgrade(async (tx) => {
        const t = tx.table("workouts");
        await t.toCollection().modify((row: WorkoutSessionRow & { sessionDate?: string }) => {
          if (!row.sessionDate) {
            row.sessionDate = localDateKeyFromMs(row.startedAt);
          }
        });
      });
  }
}

export const db = new MuscleDB();

export function newId(): string {
  return crypto.randomUUID();
}

export async function createWorkout(
  note?: string,
  sessionDateKey?: string,
): Promise<string> {
  const id = newId();
  const sessionDate = sessionDateKey?.trim() || todayLocalDateKey();
  await db.workouts.add({
    id,
    startedAt: Date.now(),
    sessionDate,
    note,
  });
  return id;
}

/**
 * 同一 sessionDate のワークアウトは1つにまとめる（既存があればそれを返す）
 */
export async function getOrCreateWorkoutForSessionDate(
  sessionDate: string,
): Promise<string> {
  const rows = await db.workouts.where("sessionDate").equals(sessionDate).toArray();
  if (rows.length > 0) {
    rows.sort((a, b) => b.startedAt - a.startedAt);
    return rows[0].id;
  }
  return createWorkout(undefined, sessionDate);
}

/** 記録がある日付を新しい順（YYYY-MM-DD 文字列ソートで可） */
export async function listDistinctSessionDatesDescending(): Promise<string[]> {
  const all = await db.workouts.toArray();
  const dates = [...new Set(all.map((w) => w.sessionDate))];
  dates.sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
  return dates;
}

export async function getWorkout(
  workoutId: string,
): Promise<WorkoutSessionRow | undefined> {
  return db.workouts.get(workoutId);
}

export async function updateWorkoutSessionDate(
  workoutId: string,
  sessionDate: string,
): Promise<void> {
  await db.workouts.update(workoutId, { sessionDate });
}

export async function deleteWorkout(workoutId: string): Promise<void> {
  await db.sets.where("workoutId").equals(workoutId).delete();
  await db.workouts.delete(workoutId);
}

export async function listRecentWorkouts(limit: number): Promise<WorkoutSessionRow[]> {
  return db.workouts.orderBy("startedAt").reverse().limit(limit).toArray();
}

export async function getSetsForWorkout(workoutId: string): Promise<WorkoutSetRow[]> {
  const rows = await db.sets.where("workoutId").equals(workoutId).sortBy("order");
  return rows;
}

export async function nextOrderForWorkout(workoutId: string): Promise<number> {
  const all = await db.sets.where("workoutId").equals(workoutId).toArray();
  if (all.length === 0) return 0;
  return Math.max(...all.map((s) => s.order)) + 1;
}

export async function addSet(
  row: Omit<WorkoutSetRow, "id"> & { id?: string },
): Promise<string> {
  const id = row.id ?? newId();
  await db.sets.add({ ...row, id });
  return id;
}

export async function updateSet(
  id: string,
  patch: Partial<Pick<WorkoutSetRow, "weightKg" | "reps" | "order">>,
): Promise<void> {
  await db.sets.update(id, patch);
}

export async function removeSet(id: string): Promise<void> {
  await db.sets.delete(id);
}

/** ワークアウトのセットを全差し替え（LLM 提案の取り込み用） */
export async function replaceSetsForWorkout(
  workoutId: string,
  rows: Omit<WorkoutSetRow, "id">[],
): Promise<void> {
  await db.sets.where("workoutId").equals(workoutId).delete();
  for (const r of rows) {
    await addSet(r);
  }
}

/** 同一種目について、現在のセッション以外で「直近」のワークアウトに記録された最終セット */
export async function getLastSetForExerciseBefore(
  exerciseId: string,
  currentWorkoutId: string,
): Promise<WorkoutSetRow | undefined> {
  const workouts = await db.workouts.toArray();
  const startedAtByWorkout = new Map(workouts.map((w) => [w.id, w.startedAt]));

  const allForExercise = await db.sets
    .where("exerciseId")
    .equals(exerciseId)
    .toArray();
  const past = allForExercise.filter((s) => s.workoutId !== currentWorkoutId);
  if (past.length === 0) return undefined;

  let latestWid = "";
  let latestT = -1;
  for (const s of past) {
    const t = startedAtByWorkout.get(s.workoutId) ?? 0;
    if (t >= latestT) {
      latestT = t;
      latestWid = s.workoutId;
    }
  }
  const inLatest = past
    .filter((s) => s.workoutId === latestWid)
    .sort((a, b) => a.order - b.order);
  return inLatest[inLatest.length - 1];
}

export async function getSetting(key: string): Promise<string | undefined> {
  const row = await db.settings.get(key);
  return row?.value;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.settings.put({ key, value });
}
