import Dexie, { type EntityTable } from "dexie";
import type { WorkoutSessionRow, WorkoutSetRow } from "@/lib/types";

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
  }
}

export const db = new MuscleDB();

export function newId(): string {
  return crypto.randomUUID();
}

export async function createWorkoutWithStartedAt(
  startedAt: number,
  note?: string,
): Promise<string> {
  const id = newId();
  await db.workouts.add({
    id,
    startedAt,
    note,
  });
  return id;
}

export async function createWorkout(note?: string): Promise<string> {
  return createWorkoutWithStartedAt(Date.now(), note);
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
