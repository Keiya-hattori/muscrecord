"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { getExerciseById } from "@/lib/exercises";
import type { ExerciseHistoryGroup } from "@/lib/stats";
import { groupHistoryByExercise } from "@/lib/stats";
import { AppNav } from "@/components/AppNav";

export function HistoryClient() {
  const workoutCount = useLiveQuery(() => db.workouts.count(), []);
  const setCount = useLiveQuery(() => db.sets.count(), []);
  const [groups, setGroups] = useState<ExerciseHistoryGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void groupHistoryByExercise().then((g) => {
      if (!cancelled) {
        setGroups(g);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [workoutCount, setCount]);

  return (
    <div className="min-h-screen pb-12">
      <AppNav current="/history" />
      <div className="mx-auto max-w-lg px-4 py-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          種目別の記録
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          種目ごとに、日付とその日のセット数を振り返れます（同日に複数セッションがある場合は合算）。
        </p>

        {loading && (
          <p className="mt-8 text-center text-sm text-zinc-500">読み込み中…</p>
        )}

        {!loading && groups.length === 0 && (
          <p className="mt-8 rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-600">
            まだ記録がありません。ホームからトレーニングを始めましょう。
          </p>
        )}

        <ul className="mt-8 flex flex-col gap-8">
          {groups.map((ex) => {
            const meta = getExerciseById(ex.exerciseId);
            const totalSets = ex.days.reduce((a, d) => a + d.setCount, 0);
            return (
              <li key={ex.exerciseId}>
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-zinc-200 pb-2 dark:border-zinc-700">
                  <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                    {meta?.name ?? ex.exerciseId}
                  </span>
                  <span className="text-xs text-zinc-500">
                    記録 {ex.days.length} 日 · 合計 {totalSets} セット
                  </span>
                </div>
                <ul className="flex flex-col gap-2 sm:grid sm:grid-cols-2">
                  {ex.days.map((row) => (
                    <li
                      key={row.dateKey}
                      className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    >
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">
                        {row.dateLabel}
                        <span className="ml-2 text-xs font-normal text-zinc-500">
                          {row.dateKey}
                        </span>
                      </span>
                      <span className="tabular-nums font-semibold text-blue-700 dark:text-blue-300">
                        {row.setCount} セット
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
