"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState } from "react";
import { db, getSetsForWorkout } from "@/lib/db";
import { formatSessionDateJp } from "@/lib/dateKey";

type Row = {
  sessionDate: string;
  workoutId: string;
  exerciseCount: number;
  setCount: number;
};

export function HistoryClient() {
  const workouts = useLiveQuery(() => db.workouts.toArray(), []);

  const mergedByDate = useMemo(() => {
    const m = new Map<string, { id: string; startedAt: number }>();
    for (const w of workouts ?? []) {
      const cur = m.get(w.sessionDate);
      if (!cur || w.startedAt > cur.startedAt) {
        m.set(w.sessionDate, { id: w.id, startedAt: w.startedAt });
      }
    }
    return [...m.entries()].sort((a, b) => (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0));
  }, [workouts]);

  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const out: Row[] = [];
      for (const [sessionDate, { id: workoutId }] of mergedByDate) {
        const sets = await getSetsForWorkout(workoutId);
        if (cancelled) return;
        if (sets.length === 0) continue;
        const exerciseIds = new Set(sets.map((s) => s.exerciseId));
        out.push({
          sessionDate,
          workoutId,
          exerciseCount: exerciseIds.size,
          setCount: sets.length,
        });
      }
      if (!cancelled) setRows(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [mergedByDate]);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-12">
      <header>
        <Link
          href="/"
          className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          ← ホーム
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          記録一覧（日付別）
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          日付をタップすると、その日の記録を開けます。
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/50">
          まだ記録がありません。ホームで日付を選んで記録を始めてください。
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => (
            <li key={r.sessionDate}>
              <Link
                href={`/day/${r.sessionDate}`}
                className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-4 shadow-sm transition hover:border-blue-300 hover:bg-blue-50/50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-blue-600 dark:hover:bg-zinc-800/80"
              >
                <div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {formatSessionDateJp(r.sessionDate)}
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    種目 {r.exerciseCount} · セット {r.setCount}
                  </div>
                </div>
                <span className="text-zinc-400" aria-hidden>
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
