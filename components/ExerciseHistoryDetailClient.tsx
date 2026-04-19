"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { db, getSetting } from "@/lib/db";
import { ExerciseCover } from "@/components/ExerciseCover";
import { getExerciseById } from "@/lib/exercises";
import {
  getAllDaysForExercise,
  loadWorkoutsForHistory,
  type ExerciseDaySummary,
} from "@/lib/exerciseHistoryQueries";
import { formatDateFullJa } from "@/lib/stats";
import { parseUserProfileJson } from "@/lib/userProfile";
import clsx from "clsx";

export function ExerciseHistoryDetailClient({ exerciseId }: { exerciseId: string }) {
  const workoutCount = useLiveQuery(() => db.workouts.count(), []);
  const setCount = useLiveQuery(() => db.sets.count(), []);
  const [days, setDays] = useState<ExerciseDaySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [bodyWeightKg, setBodyWeightKg] = useState<number | null>(null);

  useEffect(() => {
    void getSetting("userProfile").then((raw) => {
      setBodyWeightKg(parseUserProfileJson(raw).bodyWeightKg);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void loadWorkoutsForHistory().then((w) => {
      if (cancelled) return;
      setDays(
        getAllDaysForExercise(exerciseId, w, bodyWeightKg),
      );
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [exerciseId, workoutCount, setCount, bodyWeightKg]);

  const meta = getExerciseById(exerciseId);

  return (
    <div className="min-h-screen pb-12">
      <div className="mx-auto max-w-lg px-4 py-8">
        <Link
          href="/history"
          className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          ← 種目別の記録
        </Link>

        <div className="mt-4 flex items-center gap-3">
          {meta && (
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-600">
              <ExerciseCover exercise={meta} imageSizes="56px" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {meta?.name ?? exerciseId}
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              全日の記録（新しい順）
            </p>
          </div>
        </div>

        {loading && (
          <p className="mt-8 text-center text-sm text-zinc-500">読み込み中…</p>
        )}

        {!loading && days.length === 0 && (
          <p className="mt-8 rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-600">
            この種目の記録はまだありません。
          </p>
        )}

        <ul className="mt-6 flex flex-col gap-2">
          {days.map((row) => (
            <li
              key={row.dateKey}
              className={clsx(
                "flex flex-col gap-1 rounded-xl border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between",
                "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900",
              )}
            >
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                {formatDateFullJa(row.dateKey)}
              </span>
              <div className="flex flex-wrap items-baseline justify-end gap-x-3 gap-y-0.5 sm:text-right">
                <span className="tabular-nums font-semibold text-zinc-800 dark:text-zinc-200">
                  {Math.round(row.volumeKg).toLocaleString("ja-JP")} kg
                </span>
                <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                  {row.setCount} セット
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
