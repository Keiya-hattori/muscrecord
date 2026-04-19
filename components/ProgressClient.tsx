"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import {
  countUnlocked,
  evaluateAchievements,
  type AchievementStatus,
} from "@/lib/achievements";
import {
  computeGlobalAggregates,
  dailyVolumeSeries,
  weeklyVolumeSeries,
} from "@/lib/stats";
import { AppNav } from "@/components/AppNav";
import { VolumeCharts } from "@/components/ProgressCharts";
import clsx from "clsx";

export function ProgressClient() {
  const workoutCount = useLiveQuery(() => db.workouts.count(), []);
  const setCount = useLiveQuery(() => db.sets.count(), []);

  const [agg, setAgg] = useState<Awaited<
    ReturnType<typeof computeGlobalAggregates>
  > | null>(null);
  const [daily, setDaily] = useState<
    Awaited<ReturnType<typeof dailyVolumeSeries>>
  >([]);
  const [weekly, setWeekly] = useState<
    Awaited<ReturnType<typeof weeklyVolumeSeries>>
  >([]);
  const [achievements, setAchievements] = useState<AchievementStatus[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [a, d, w] = await Promise.all([
        computeGlobalAggregates(),
        dailyVolumeSeries(14),
        weeklyVolumeSeries(8),
      ]);
      if (cancelled) return;
      setAgg(a);
      setDaily(d);
      setWeekly(w);
      setAchievements(evaluateAchievements(a));
    })();
    return () => {
      cancelled = true;
    };
  }, [workoutCount, setCount]);

  const unlocked = countUnlocked(achievements);

  return (
    <div className="min-h-screen pb-16">
      <AppNav current="/progress" />
      <div className="mx-auto max-w-lg px-4 py-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          グラフ・称号
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          累計の記録と、達成した称号を確認できます。
        </p>

        {!agg ? (
          <p className="mt-8 text-center text-sm text-zinc-500">読み込み中…</p>
        ) : (
          <>
            <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-2">
              <StatCard label="累計セッション" value={String(agg.totalWorkouts)} />
              <StatCard label="累計セット" value={String(agg.totalSets)} />
              <StatCard
                label="累計ボリューム"
                value={`${Math.round(agg.totalVolume).toLocaleString()} kg`}
              />
              <StatCard label="種目バラエティ" value={`${agg.uniqueExerciseCount} 種目`} />
            </section>

            <section className="mt-10">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                ボリュームの推移
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                ボリューム = 重量(kg) × 回数 の合計です。
              </p>
              <div className="mt-4">
                <VolumeCharts daily={daily} weekly={weekly} />
              </div>
            </section>

            <section className="mt-12">
              <div className="mb-4 flex items-baseline justify-between gap-2">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                  称号
                </h2>
                <span className="text-sm text-zinc-500">
                  獲得 {unlocked} / {achievements.length}
                </span>
              </div>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {achievements.map((a) => (
                  <li
                    key={a.id}
                    className={clsx(
                      "flex gap-3 rounded-2xl border p-4 transition",
                      a.unlocked
                        ? "border-amber-200 bg-amber-50/80 dark:border-amber-800 dark:bg-amber-950/30"
                        : "border-zinc-200 opacity-60 grayscale dark:border-zinc-700",
                    )}
                  >
                    <span className="text-3xl" aria-hidden>
                      {a.icon}
                    </span>
                    <div>
                      <p className="font-bold text-zinc-900 dark:text-zinc-50">
                        {a.title}
                        {a.unlocked ? (
                          <span className="ml-2 text-xs font-normal text-emerald-600 dark:text-emerald-400">
                            獲得済み
                          </span>
                        ) : (
                          <span className="ml-2 text-xs font-normal text-zinc-400">
                            未獲得
                          </span>
                        )}
                      </p>
                      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                        {a.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
        {value}
      </p>
    </div>
  );
}
