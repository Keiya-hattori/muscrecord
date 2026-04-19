"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useEffect, useMemo, useState } from "react";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/db";
import { ExerciseCover } from "@/components/ExerciseCover";
import { PULL_UP_EXERCISE_ID } from "@/lib/effectiveVolume";
import { getExerciseById } from "@/lib/exercises";
import {
  computeBestDayForExercise,
  getRecentDaysForExercise,
  loadWorkoutsForHistory,
  type BestDayResult,
  type ExerciseDaySummary,
} from "@/lib/exerciseHistoryQueries";
import {
  getEffectiveFavoriteIds,
  loadHistoryFavoriteIds,
  subscribeHistoryFavorites,
} from "@/lib/historyFavorites";
import {
  RECORD_BODY_TABS,
  exercisesForRecordTab,
} from "@/lib/recordBodyTabs";
import { useRecordableExercises } from "@/hooks/useRecordableExercises";
import { parseUserProfileJson } from "@/lib/userProfile";
import { formatDateFullJa } from "@/lib/stats";
import { AppNav } from "@/components/AppNav";
import clsx from "clsx";

export function HistoryClient() {
  const workoutCount = useLiveQuery(() => db.workouts.count(), []);
  const setCount = useLiveQuery(() => db.sets.count(), []);
  const allExercises = useRecordableExercises();

  /** SSR 時は localStorage なし → null → デフォルトお気に入り。これが空のままだと名前順1件目になりベンチにならない */
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() =>
    getEffectiveFavoriteIds(loadHistoryFavoriteIds()),
  );
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>("");
  const [bodyWeightKg, setBodyWeightKg] = useState<number | null>(null);
  const [workouts, setWorkouts] = useState<Awaited<
    ReturnType<typeof loadWorkoutsForHistory>
  > | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshFavorites = useCallback(() => {
    setFavoriteIds(getEffectiveFavoriteIds(loadHistoryFavoriteIds()));
  }, []);

  useEffect(() => {
    refreshFavorites();
    return subscribeHistoryFavorites(refreshFavorites);
  }, [refreshFavorites]);

  useEffect(() => {
    void getSetting("userProfile").then((raw) => {
      setBodyWeightKg(parseUserProfileJson(raw).bodyWeightKg);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void loadWorkoutsForHistory().then((w) => {
      if (!cancelled) {
        setWorkouts(w);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [workoutCount, setCount]);

  const sortedOptions = useMemo(() => {
    const ids = new Set<string>();
    const visibleInRecord = RECORD_BODY_TABS.flatMap((tab) =>
      exercisesForRecordTab(tab.id, allExercises),
    ).filter((ex) => {
      if (ids.has(ex.id)) return false;
      ids.add(ex.id);
      return true;
    });
    return visibleInRecord.sort((a, b) =>
      a.name.localeCompare(b.name, "ja"),
    );
  }, [allExercises]);

  useEffect(() => {
    if (selectedExerciseId) return;
    if (sortedOptions.length === 0) return;
    const firstFav = favoriteIds.find((id) =>
      sortedOptions.some((e) => e.id === id),
    );
    setSelectedExerciseId(firstFav ?? sortedOptions[0].id);
  }, [selectedExerciseId, sortedOptions, favoriteIds]);

  const bestDay: BestDayResult | null = useMemo(() => {
    if (!workouts || !selectedExerciseId) return null;
    return computeBestDayForExercise(
      selectedExerciseId,
      workouts,
      bodyWeightKg,
    );
  }, [workouts, selectedExerciseId, bodyWeightKg]);

  const recent: ExerciseDaySummary[] = useMemo(() => {
    if (!workouts || !selectedExerciseId) return [];
    return getRecentDaysForExercise(
      selectedExerciseId,
      workouts,
      5,
      bodyWeightKg,
    );
  }, [workouts, selectedExerciseId, bodyWeightKg]);

  const selectedMeta = selectedExerciseId
    ? getExerciseById(selectedExerciseId)
    : undefined;

  return (
    <div className="min-h-screen pb-12">
      <AppNav current="/history" />
      <div className="mx-auto max-w-lg px-4 py-10">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          種目別の記録
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          上のリストで種目を選ぶと、ベストの日の全セットと直近5日分を表示します。お気に入りは設定から編集できます。
        </p>

        <div className="mt-6">
          <label
            htmlFor="history-exercise-select"
            className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
          >
            種目を選ぶ
          </label>
          <select
            id="history-exercise-select"
            className="mt-2 w-full rounded-xl border border-zinc-300/80 bg-white/90 px-4 py-3 text-base font-medium text-zinc-900 dark:border-white/15 dark:bg-zinc-900/70 dark:text-zinc-50"
            value={selectedExerciseId}
            onChange={(e) => setSelectedExerciseId(e.target.value)}
          >
            {sortedOptions.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
              </option>
            ))}
          </select>
        </div>

        {favoriteIds.length > 0 && (
          <section className="mt-8">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                お気に入り
              </h2>
              <Link
                href="/settings#history-favorites"
                className="text-xs font-medium text-violet-700 hover:underline dark:text-violet-300"
              >
                設定で編集
              </Link>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {favoriteIds.map((id) => {
                const ex = getExerciseById(id);
                if (!ex) return null;
                const active = id === selectedExerciseId;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedExerciseId(id)}
                    className={clsx(
                      "flex items-center gap-2 rounded-xl border px-2 py-2 text-left text-sm transition",
                      active
                        ? "border-violet-500 bg-violet-50 ring-1 ring-violet-400 dark:bg-violet-500/20"
                        : "border-zinc-200/80 bg-white/80 hover:bg-zinc-50 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]",
                    )}
                  >
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg">
                      <ExerciseCover exercise={ex} />
                    </div>
                    <span className="max-w-[7rem] leading-tight">{ex.name}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {selectedExerciseId && (
          <article className="mt-10 rounded-2xl border border-zinc-200/80 bg-white/85 p-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
            <div className="mb-4 flex items-start gap-3">
              {selectedMeta && (
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-zinc-200/80 dark:border-white/15">
                  <ExerciseCover exercise={selectedMeta} imageSizes="56px" />
                </div>
              )}
              <div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                  {selectedMeta?.name ?? selectedExerciseId}
                </h2>
                {selectedExerciseId === PULL_UP_EXERCISE_ID &&
                  bodyWeightKg != null && (
                    <p className="mt-1 text-xs text-zinc-500">
                      換算: 設定の体重 {bodyWeightKg} kg × 回数（加重0のとき）
                    </p>
                  )}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-300/80 bg-zinc-50/85 p-4 dark:border-white/15 dark:bg-zinc-900/60">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {selectedExerciseId === PULL_UP_EXERCISE_ID
                  ? "歴代ベストの日（合計回数）"
                  : "歴代ベストの日（総ボリューム）"}
              </p>
              {loading || !workouts ? (
                <p className="mt-2 text-sm text-zinc-500">読み込み中…</p>
              ) : !bestDay ? (
                <p className="mt-2 text-sm text-zinc-500">まだ記録がありません</p>
              ) : (
                <>
                  <p className="mt-2 text-xs text-zinc-500">
                    {formatDateFullJa(bestDay.dateKey)}
                  </p>
                  <ul className="mt-3 space-y-2">
                    {bestDay.sets.map((row, idx) => (
                      <li
                        key={`${bestDay.dateKey}-${idx}-${row.order}`}
                        className="text-sm font-mono font-semibold tabular-nums text-zinc-900 dark:text-zinc-50"
                      >
                        {row.weightKg} kg × {row.reps} 回
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex justify-end border-t border-zinc-200 pt-3 dark:border-zinc-700">
                    {bestDay.kind === "pullup" ? (
                      <span className="text-sm font-bold tabular-nums text-zinc-800 dark:text-zinc-100">
                        合計 {bestDay.totalReps} 回
                      </span>
                    ) : (
                      <span className="text-sm font-bold tabular-nums text-zinc-800 dark:text-zinc-100">
                        合計{" "}
                        {Math.round(bestDay.totalVolume).toLocaleString("ja-JP")}{" "}
                        kg
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="mt-4">
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                直近のトレーニング日（最大5日）
              </p>
              {!loading && recent.length === 0 ? (
                <p className="mt-2 text-sm text-zinc-500">まだありません</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {recent.map((row) => (
                    <li
                      key={row.dateKey}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-100 bg-zinc-50/50 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900/40"
                    >
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">
                        {formatDateFullJa(row.dateKey)}
                      </span>
                      <span className="tabular-nums text-zinc-700 dark:text-zinc-300">
                        {Math.round(row.volumeKg).toLocaleString("ja-JP")} kg
                        <span className="ml-2 text-xs text-zinc-500">
                          {row.setCount} セット
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href={`/history/exercise?exerciseId=${encodeURIComponent(selectedExerciseId)}`}
                className="mt-3 inline-block text-sm font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
              >
                過去分すべて →
              </Link>
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
