"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { ExercisePicker } from "@/components/ExercisePicker";
import { AppNav } from "@/components/AppNav";
import { SessionExercisePanel } from "@/components/SessionExercisePanel";
import { db, getLastSetForExerciseBefore } from "@/lib/db";
import { getExerciseById } from "@/lib/exercises";
import { workoutSelectedStorageKey } from "@/lib/uiPersist";

type Props = {
  workoutId: string;
};

export function WorkoutSessionClient({ workoutId }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastPrev, setLastPrev] = useState<{
    weightKg: number;
    reps: number;
  } | null>(null);

  const setsInSession = useLiveQuery(
    () =>
      db.sets
        .where("workoutId")
        .equals(workoutId)
        .toArray()
        .then((rows) => rows.sort((a, b) => a.order - b.order)),
    [workoutId],
  );

  const exercisesWithSets = useMemo(() => {
    const rows = setsInSession ?? [];
    const seen = new Set<string>();
    const order: string[] = [];
    for (const r of rows) {
      if (!seen.has(r.exerciseId)) {
        seen.add(r.exerciseId);
        order.push(r.exerciseId);
      }
    }
    return order;
  }, [setsInSession]);

  const persistSelected = useCallback(
    (id: string) => {
      try {
        sessionStorage.setItem(workoutSelectedStorageKey(workoutId), id);
      } catch {
        /* プライベートモード等 */
      }
    },
    [workoutId],
  );

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const key = workoutSelectedStorageKey(workoutId);
    const v = sessionStorage.getItem(key);
    setSelectedId(v && v.length > 0 ? v : null);
  }, [workoutId]);

  const pickExercise = useCallback(
    (exerciseId: string) => {
      setSelectedId(exerciseId);
      persistSelected(exerciseId);
    },
    [persistSelected],
  );

  useEffect(() => {
    if (!selectedId) {
      setLastPrev(null);
      return;
    }
    let cancelled = false;
    void getLastSetForExerciseBefore(selectedId, workoutId).then((row) => {
      if (cancelled) return;
      if (row)
        setLastPrev({ weightKg: row.weightKg, reps: row.reps });
      else setLastPrev(null);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedId, workoutId]);

  const countByExercise = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of setsInSession ?? []) {
      m.set(r.exerciseId, (m.get(r.exerciseId) ?? 0) + 1);
    }
    return m;
  }, [setsInSession]);

  return (
    <div className="min-h-screen">
      <AppNav />
      <div className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          種目タップで選択 → セットを記録
        </p>
      </header>

      <section>
        <h2 className="mb-4 text-xl font-bold text-zinc-900 dark:text-zinc-50">
          種目を選ぶ
        </h2>
        <ExercisePicker onPick={pickExercise} selectedId={selectedId} />
      </section>

      {selectedId && (
        <SessionExercisePanel
          workoutId={workoutId}
          exerciseId={selectedId}
          lastFromPrevious={lastPrev}
        />
      )}

      {exercisesWithSets.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            このセッションの種目
          </h3>
          <div className="flex flex-wrap gap-2">
            {exercisesWithSets.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => pickExercise(id)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  selectedId === id
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-200 text-zinc-800 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
                }`}
              >
                {getExerciseById(id)?.name ?? id}{" "}
                <span className="tabular-nums opacity-80">
                  ({countByExercise.get(id) ?? 0})
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
      </div>
    </div>
  );
}
