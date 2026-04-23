import Dexie, { type EntityTable } from "dexie";
import type { WorkoutSessionRow, WorkoutSetRow } from "@/lib/types";
import type { PendingLlmMenuPayload } from "@/lib/pendingLlmMenu";
import { parsePendingMenuJson } from "@/lib/pendingLlmMenu";
import { localDateKeyFromMs } from "@/lib/dateKey";
import { getLocalSetting, setLocalSetting } from "@/lib/localSettings";

class MuscleDB extends Dexie {
  workouts!: EntityTable<WorkoutSessionRow, "id">;
  sets!: EntityTable<WorkoutSetRow, "id">;

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
    /** 設定は localStorage（muscrecord:setting:*）へ。IndexedDB の settings は廃止 */
    this.version(3)
      .stores({
        workouts: "id, startedAt, sessionDate",
        sets: "id, workoutId, exerciseId",
      })
      .upgrade(async (tx) => {
        const t = tx.table("settings");
        const rows = await t.toArray();
        for (const row of rows as { key: string; value: string }[]) {
          try {
            setLocalSetting(row.key, row.value);
          } catch {
            /* ignore */
          }
        }
      });
    /** セット0件のゴーストワークアウトを整理 */
    this.version(4)
      .stores({
        workouts: "id, startedAt, sessionDate",
        sets: "id, workoutId, exerciseId",
      })
      .upgrade(async (tx) => {
        const tw = tx.table("workouts");
        const allW = (await tw.toArray()) as WorkoutSessionRow[];
        for (const w of allW) {
          const n = await tx.table("sets").where("workoutId").equals(w.id).count();
          if (n === 0) await tw.delete(w.id);
        }
      });
  }
}

export const db = new MuscleDB();

export function newId(): string {
  return crypto.randomUUID();
}

/** 過去日時のセッション（サンプルデータ等）用 */
export async function createWorkoutWithStartedAt(
  startedAt: number,
  note?: string,
  sessionDateKey?: string,
): Promise<string> {
  const id = newId();
  const sessionDate =
    sessionDateKey?.trim() || localDateKeyFromMs(startedAt);
  await db.workouts.add({
    id,
    startedAt,
    sessionDate,
    note,
  });
  return id;
}

export async function createWorkout(
  note?: string,
  sessionDateKey?: string,
): Promise<string> {
  return createWorkoutWithStartedAt(Date.now(), note, sessionDateKey);
}

/**
 * 同一 sessionDate のワークアウト（既存のみ。なければ null）
 * 日付ページを覗くだけでセッションを増やさないため。
 */
export async function getWorkoutIdForSessionDate(
  sessionDate: string,
): Promise<string | null> {
  const rows = await db.workouts.where("sessionDate").equals(sessionDate).toArray();
  if (rows.length === 0) return null;
  rows.sort((a, b) => b.startedAt - a.startedAt);
  return rows[0].id;
}

/**
 * 同一 sessionDate のワークアウトは1つにまとめる（既存があればそれを返す）
 */
export async function getOrCreateWorkoutForSessionDate(
  sessionDate: string,
): Promise<string> {
  const existing = await getWorkoutIdForSessionDate(sessionDate);
  if (existing) return existing;
  return createWorkout(undefined, sessionDate);
}

export async function updateWorkoutTrainingContext(
  workoutId: string,
  trainingContext: WorkoutSessionRow["trainingContext"],
): Promise<void> {
  await db.workouts.update(workoutId, { trainingContext: trainingContext ?? null });
}

/** 記録がある日付を新しい順（セット1件以上の日のみ） */
export async function listDistinctSessionDatesDescending(): Promise<string[]> {
  const allSets = await db.sets.toArray();
  const widWithSets = new Set(allSets.map((s) => s.workoutId));
  const all = await db.workouts.toArray();
  const dates = [
    ...new Set(
      all.filter((w) => widWithSets.has(w.id)).map((w) => w.sessionDate),
    ),
  ];
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
  patch: Partial<
    Pick<
      WorkoutSetRow,
      | "weightKg"
      | "reps"
      | "order"
      | "setKind"
      | "rir"
      | "weightLeftKg"
      | "weightRightKg"
      | "repsLeft"
      | "repsRight"
    >
  >,
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

/** LLM 提案 ToDo。空ならフィールドを空文字にクリア（IndexedDB での削除互換） */
export async function setWorkoutPendingLlmMenu(
  workoutId: string,
  payload: PendingLlmMenuPayload | null,
): Promise<void> {
  await db.workouts.update(workoutId, {
    pendingLlmMenuJson:
      payload && payload.rows.length > 0 ? JSON.stringify(payload) : "",
  });
}

/** ToDo 行を記録済みに（行は一覧に残す） */
export async function markPendingLlmRowApplied(
  workoutId: string,
  rowId: string,
): Promise<void> {
  const w = await db.workouts.get(workoutId);
  const payload = parsePendingMenuJson(w?.pendingLlmMenuJson);
  if (!payload) return;
  const nextRows = payload.rows.map((r) =>
    r.id === rowId ? { ...r, applied: true } : r,
  );
  await setWorkoutPendingLlmMenu(workoutId, {
    ...payload,
    rows: nextRows,
  });
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

/** 設定（localStorage）。SSR では undefined */
export async function getSetting(key: string): Promise<string | undefined> {
  return Promise.resolve(getLocalSetting(key));
}

export async function setSetting(key: string, value: string): Promise<void> {
  setLocalSetting(key, value);
}
