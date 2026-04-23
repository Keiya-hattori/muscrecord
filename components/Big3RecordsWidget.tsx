"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { getBig3MaxKg } from "@/lib/stats";

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
