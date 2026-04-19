"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { getExerciseById } from "@/lib/exercises";
import {
  formatDateFullJa,
  groupHistoryByExercise,
  type ExerciseHistoryGroup,
} from "@/lib/stats";
import { AppNav } from "@/components/AppNav";
import clsx from "clsx";

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
          種目ごとに日付・総ボリューム・セット数を表示します（同日に複数セッションがある場合は合算）。一覧の並びは、その種目を記録した日数が多い順です。
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
            const totalVol = ex.days.reduce((a, d) => a + d.volumeKg, 0);
            return (
              <li key={ex.exerciseId}>
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-zinc-200 pb-2 dark:border-zinc-700">
                  <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                    {meta?.name ?? ex.exerciseId}
                  </span>
                  <span className="text-right text-xs text-zinc-500">
                    記録 {ex.days.length} 日
                    <span className="mx-1 text-zinc-300 dark:text-zinc-600">
                      ·
                    </span>
                    総{" "}
                    <span className="font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">
                      {Math.round(totalVol).toLocaleString("ja-JP")}
                    </span>{" "}
                    kg
                    <span className="mx-1 text-zinc-300 dark:text-zinc-600">
                      ·
                    </span>
                    {totalSets} セット
                  </span>
                </div>
                <ul className="flex flex-col gap-2 sm:grid sm:grid-cols-2">
                  {ex.days.map((row) => (
                    <li
                      key={row.dateKey}
                      className={clsx(
                        "flex flex-col gap-1 rounded-xl border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between",
                        row.isPersonalBestVolume
                          ? "border-amber-400/90 bg-gradient-to-br from-amber-50 to-orange-50 shadow-sm dark:border-amber-600/60 dark:from-amber-950/50 dark:to-orange-950/30"
                          : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900",
                      )}
                    >
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">
                        {formatDateFullJa(row.dateKey)}
                      </span>
                      <div className="flex flex-wrap items-baseline justify-end gap-x-3 gap-y-0.5 sm:text-right">
                        <span
                          className={clsx(
                            "tabular-nums font-semibold",
                            row.isPersonalBestVolume
                              ? "text-amber-800 dark:text-amber-200"
                              : "text-zinc-800 dark:text-zinc-200",
                          )}
                        >
                          {Math.round(row.volumeKg).toLocaleString("ja-JP")} kg
                        </span>
                        <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                          {row.setCount} セット
                        </span>
                        {row.isPersonalBestVolume && (
                          <span className="rounded-md bg-amber-500 px-2 py-0.5 text-[10px] font-black text-amber-950 dark:bg-amber-400 dark:text-amber-950">
                            自己ベスト
                          </span>
                        )}
                      </div>
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
