import { db } from "@/lib/db";
import {
  clearAllLocalSettings,
  getLocalSetting,
  listLocalSettingKeys,
  setLocalSetting,
} from "@/lib/localSettings";
import {
  LS_EXERCISE_PICKER,
  LS_TODAY_CONTEXT,
  LS_USER_PROFILE_FORM,
} from "@/lib/uiPersist";
import type { WorkoutSessionRow, WorkoutSetRow } from "@/lib/types";

/** バックアップ JSON のスキーマ版（後方互換用） */
export const BACKUP_FORMAT_VERSION = 1;

export type MuscleBackupPayload = {
  v: number;
  exportedAt: string;
  workouts: WorkoutSessionRow[];
  sets: WorkoutSetRow[];
  /** muscrecord:setting:* のキー→値 */
  settings: Record<string, string>;
  /** 画面ドラフト等（任意） */
  ui?: Record<string, string>;
};

function isWorkoutRow(x: unknown): x is WorkoutSessionRow {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.startedAt === "number" &&
    typeof o.sessionDate === "string"
  );
}

function isSetRow(x: unknown): x is WorkoutSetRow {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.workoutId === "string" &&
    typeof o.exerciseId === "string" &&
    typeof o.order === "number" &&
    typeof o.weightKg === "number" &&
    typeof o.reps === "number"
  );
}

function parseBackup(data: unknown): MuscleBackupPayload | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  if (o.v !== BACKUP_FORMAT_VERSION) return null;
  if (typeof o.exportedAt !== "string") return null;
  if (!Array.isArray(o.workouts) || !Array.isArray(o.sets)) return null;
  if (!o.settings || typeof o.settings !== "object") return null;
  if (!o.workouts.every(isWorkoutRow)) return null;
  if (!o.sets.every(isSetRow)) return null;
  const settings: Record<string, string> = {};
  for (const [k, v] of Object.entries(
    o.settings as Record<string, unknown>,
  )) {
    if (typeof v === "string") settings[k] = v;
  }
  const uiRaw = o.ui;
  let ui: Record<string, string> | undefined;
  if (uiRaw && typeof uiRaw === "object") {
    ui = {};
    for (const [k, v] of Object.entries(uiRaw as Record<string, unknown>)) {
      if (typeof v === "string") ui[k] = v;
    }
  }
  return {
    v: BACKUP_FORMAT_VERSION,
    exportedAt: o.exportedAt,
    workouts: o.workouts,
    sets: o.sets,
    settings,
    ui,
  };
}

/** 記録（IndexedDB）＋設定（localStorage）を1つの JSON にまとめる */
export async function exportAllDataJson(): Promise<string> {
  const [workouts, sets] = await Promise.all([
    db.workouts.toArray(),
    db.sets.toArray(),
  ]);
  const settings: Record<string, string> = {};
  for (const key of listLocalSettingKeys()) {
    const v = getLocalSetting(key);
    if (v !== undefined) settings[key] = v;
  }
  const ui: Record<string, string> = {};
  if (typeof window !== "undefined") {
    for (const k of [LS_TODAY_CONTEXT, LS_USER_PROFILE_FORM, LS_EXERCISE_PICKER]) {
      try {
        const raw = localStorage.getItem(k);
        if (raw !== null) ui[k] = raw;
      } catch {
        /* ignore */
      }
    }
  }
  const payload: MuscleBackupPayload = {
    v: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    workouts,
    sets,
    settings,
    ...(Object.keys(ui).length > 0 ? { ui } : {}),
  };
  return JSON.stringify(payload, null, 2);
}

/** バックアップを復元（既存の記録・設定を上書き） */
export async function importAllDataFromJson(json: string): Promise<void> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json) as unknown;
  } catch {
    throw new Error("JSON の形式が不正です。");
  }
  const data = parseBackup(parsed);
  if (!data) {
    throw new Error(
      `想定したバックアップ形式ではありません（v=${BACKUP_FORMAT_VERSION} のみ対応）。`,
    );
  }

  await db.transaction("rw", [db.workouts, db.sets], async () => {
    await db.sets.clear();
    await db.workouts.clear();
    for (const w of data.workouts) {
      await db.workouts.add(w);
    }
    for (const s of data.sets) {
      await db.sets.add(s);
    }
  });

  if (typeof window !== "undefined") {
    clearAllLocalSettings();
    for (const [k, v] of Object.entries(data.settings)) {
      setLocalSetting(k, v);
    }
    if (data.ui) {
      for (const [k, v] of Object.entries(data.ui)) {
        try {
          localStorage.setItem(k, v);
        } catch {
          /* ignore */
        }
      }
    }
  }
}
