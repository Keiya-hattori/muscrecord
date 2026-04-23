"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import {
  getBig3MaxKg,
  getWeeklyMajorBodyPartMainSetCounts,
  type MajorBodyPartSetCounts,
} from "@/lib/stats";

function formatKg(n: number): string {
  if (n <= 0) return "—";
  return n % 1 === 0 ? String(Math.round(n)) : n.toFixed(1);
}

export function Big3RecordsWidget() {
  const workoutCount = useLiveQuery(() => db.workouts.count(), []);
  const setCount = useLiveQuery(() => db.sets.count(), []);
  const [data, setData] = useState<{ bench: number; squat: number; dead: number } | null>(null);

  useEffect(() => {
    void getBig3MaxKg().then(setData);
  }, [workoutCount, setCount]);

  const b = data?.bench ?? 0;
  const s = data?.squat ?? 0;
  const d = data?.dead ?? 0;
  const hasAny = b > 0 || s > 0 || d > 0;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-zinc-300/30 bg-gradient-to-br from-slate-950 via-zinc-900 to-slate-900 p-5 text-white shadow-xl shadow-black/30 ring-1 ring-white/10 dark:from-slate-950 dark:via-zinc-900 dark:to-zinc-950">
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-500/20 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-amber-500/10 blur-2xl"
        aria-hidden
      />

      <div className="relative">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200/80">
          BIG3 記録
        </p>
        <h2 className="mt-1 text-lg font-bold tracking-tight text-white">
          最大重量
        </h2>
        <p className="mt-0.5 text-xs text-zinc-400">
          1回以上扱ったセットのうち、ログ上の最大（kg）
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-2">
          <Big3Card
            label="ベンチプレス"
            value={b}
            accent="from-rose-500/20 to-rose-600/5"
            border="border-rose-500/20"
          />
          <Big3Card
            label="スクワット"
            value={s}
            accent="from-sky-500/20 to-sky-600/5"
            border="border-sky-500/20"
          />
          <Big3Card
            label="デッドリフト"
            value={d}
            accent="from-amber-500/20 to-amber-600/5"
            border="border-amber-500/20"
          />
        </div>

        {!hasAny && data !== null && (
          <p className="mt-3 text-center text-xs text-zinc-500">
            記録を付けると、ここに表示されます
          </p>
        )}

      </div>
    </section>
  );
}

export function WeeklyMainSetCountsWidget() {
  const workoutCount = useLiveQuery(() => db.workouts.count(), []);
  const setCount = useLiveQuery(() => db.sets.count(), []);
  const [weeklySets, setWeeklySets] = useState<MajorBodyPartSetCounts | null>(null);

  useEffect(() => {
    void getWeeklyMajorBodyPartMainSetCounts().then(setWeeklySets);
  }, [workoutCount, setCount]);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
        今週のメインセット数
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
        <BodyPartSetChipWhite label="胸" count={weeklySets?.chest ?? 0} />
        <BodyPartSetChipWhite label="背中" count={weeklySets?.back ?? 0} />
        <BodyPartSetChipWhite label="脚" count={weeklySets?.legs ?? 0} />
        <BodyPartSetChipWhite label="腕" count={weeklySets?.arms ?? 0} />
        <BodyPartSetChipWhite label="肩" count={weeklySets?.shoulders ?? 0} />
      </div>
    </section>
  );
}

function Big3Card({
  label,
  value,
  accent,
  border,
}: {
  label: string;
  value: number;
  accent: string;
  border: string;
}) {
  return (
    <div
      className={`rounded-xl border bg-gradient-to-b ${accent} ${border} px-3 py-3 backdrop-blur-sm`}
    >
      <p className="text-[11px] font-medium text-zinc-300">{label}</p>
      <p className="mt-1 font-mono text-2xl font-black tabular-nums tracking-tight text-white sm:text-3xl">
        {value > 0 ? (
          <>
            {formatKg(value)}
            <span className="ml-0.5 text-sm font-bold text-zinc-400">kg</span>
          </>
        ) : (
          <span className="text-zinc-500">—</span>
        )}
      </p>
    </div>
  );
}

function BodyPartSetChipWhite({ label, count }: { label: string; count: number }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-center dark:border-zinc-700 dark:bg-zinc-800/60">
      <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="font-mono text-sm font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
        {count} セット
      </p>
    </div>
  );
}
