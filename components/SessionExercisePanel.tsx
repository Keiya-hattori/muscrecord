"use client";

import { useLiveQuery } from "dexie-react-hooks";
import {
  addSet,
  db,
  nextOrderForWorkout,
  removeSet,
  updateSet,
} from "@/lib/db";
import { getExerciseById } from "@/lib/exercises";
import clsx from "clsx";

type Props = {
  workoutId: string;
  exerciseId: string;
  /** 別セッションで同一種目に記録があったときのプリセット */
  lastFromPrevious?: { weightKg: number; reps: number } | null;
};

function StepChip({
  label,
  onClick,
  className,
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "min-h-[44px] min-w-[44px] rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 shadow-sm active:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:active:bg-zinc-700",
        className,
      )}
    >
      {label}
    </button>
  );
}

export function SessionExercisePanel({
  workoutId,
  exerciseId,
  lastFromPrevious,
}: Props) {
  const exercise = getExerciseById(exerciseId);

  const sets = useLiveQuery(
    () =>
      db.sets
        .where("workoutId")
        .equals(workoutId)
        .toArray()
        .then((rows) =>
          rows
            .filter((r) => r.exerciseId === exerciseId)
            .sort((a, b) => a.order - b.order),
        ),
    [workoutId, exerciseId],
  );

  const displaySets = sets ?? [];

  async function applyPresetLast() {
    if (!lastFromPrevious) return;
    const order = await nextOrderForWorkout(workoutId);
    await addSet({
      workoutId,
      exerciseId,
      order,
      weightKg: lastFromPrevious.weightKg,
      reps: lastFromPrevious.reps,
    });
  }

  async function addEmptySet() {
    const order = await nextOrderForWorkout(workoutId);
    const lastInPanel = displaySets[displaySets.length - 1];
    const weightKg = lastInPanel?.weightKg ?? lastFromPrevious?.weightKg ?? 20;
    const reps = lastInPanel?.reps ?? lastFromPrevious?.reps ?? 10;
    await addSet({
      workoutId,
      exerciseId,
      order,
      weightKg,
      reps,
    });
  }

  if (!exercise) return null;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
          {exercise.name}
        </h3>
        <div className="flex flex-wrap gap-2">
          {lastFromPrevious && (
            <button
              type="button"
              onClick={() => void applyPresetLast()}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-500 active:scale-[0.98]"
            >
              前回と同じ
            </button>
          )}
          <button
            type="button"
            onClick={() => void addEmptySet()}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-500 active:scale-[0.98]"
          >
            セット追加
          </button>
        </div>
      </div>

      <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
        直前セットの重量・回数を引き継いで追加します。「前回と同じ」は過去セッションの最終セットをコピーします。
      </p>

      <ul className="flex flex-col gap-4">
        {displaySets.map((row, idx) => (
          <li
            key={row.id}
            className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-600 dark:bg-zinc-800/80"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                セット {idx + 1}
              </span>
              <button
                type="button"
                className="text-xs text-red-600 hover:underline dark:text-red-400"
                onClick={() => void removeSet(row.id)}
              >
                削除
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  重量 (kg)
                </div>
                <div className="mb-2 text-center font-mono text-3xl font-bold tabular-nums text-zinc-900 dark:text-white">
                  {row.weightKg}
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  <StepChip
                    label="−5"
                    onClick={() =>
                      void updateSet(row.id, {
                        weightKg: Math.max(0, row.weightKg - 5),
                      })
                    }
                  />
                  <StepChip
                    label="−2.5"
                    onClick={() =>
                      void updateSet(row.id, {
                        weightKg: Math.max(0, row.weightKg - 2.5),
                      })
                    }
                  />
                  <StepChip
                    label="+2.5"
                    onClick={() =>
                      void updateSet(row.id, { weightKg: row.weightKg + 2.5 })
                    }
                  />
                  <StepChip
                    label="+5"
                    onClick={() =>
                      void updateSet(row.id, { weightKg: row.weightKg + 5 })
                    }
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  回数
                </div>
                <div className="mb-2 text-center font-mono text-3xl font-bold tabular-nums text-zinc-900 dark:text-white">
                  {row.reps}
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  <StepChip
                    label="−1"
                    onClick={() =>
                      void updateSet(row.id, {
                        reps: Math.max(0, row.reps - 1),
                      })
                    }
                  />
                  <StepChip
                    label="+1"
                    onClick={() =>
                      void updateSet(row.id, { reps: row.reps + 1 })
                    }
                  />
                  <StepChip
                    label="+5"
                    onClick={() =>
                      void updateSet(row.id, { reps: row.reps + 5 })
                    }
                  />
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {displaySets.length === 0 && (
        <p className="py-6 text-center text-sm text-zinc-500">
          セットがありません。「セット追加」または「前回と同じ」から記録を始めましょう。
        </p>
      )}
    </section>
  );
}
