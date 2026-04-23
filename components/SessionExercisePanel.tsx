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
import {
  DEFAULT_REPS_FOR_NEW_SET,
  getDefaultWeightKgForExercise,
} from "@/lib/defaultWeightKg";
import { snapWeightToStepKg } from "@/lib/recordBodyTabs";
import type { SetKind } from "@/lib/types";
import { ExerciseCover } from "@/components/ExerciseCover";
import { SetRowKindRirHeader } from "@/components/SetRowKindRirHeader";
import { StepChip } from "@/components/StepChip";

type Props = {
  workoutId: string;
  exerciseId: string;
  /** 別セッションで同一種目に記録があったときのプリセット */
  lastFromPrevious?: { weightKg: number; reps: number } | null;
};

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
      weightKg: snapWeightToStepKg(lastFromPrevious.weightKg, exerciseId),
      reps: lastFromPrevious.reps,
      setKind: "main",
    });
  }

  async function addEmptySet() {
    const order = await nextOrderForWorkout(workoutId);
    const lastInPanel = displaySets[displaySets.length - 1];
    const weightKg =
      lastInPanel?.weightKg ??
      lastFromPrevious?.weightKg ??
      getDefaultWeightKgForExercise(exerciseId);
    const reps =
      lastInPanel?.reps ?? lastFromPrevious?.reps ?? DEFAULT_REPS_FOR_NEW_SET;
    await addSet({
      workoutId,
      exerciseId,
      order,
      weightKg: snapWeightToStepKg(weightKg, exerciseId),
      reps,
      setKind: lastInPanel?.setKind ?? "main",
    });
  }

  if (!exercise) return null;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800">
            <ExerciseCover exercise={exercise} imageSizes="56px" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            {exercise.name}
          </h3>
        </div>
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
            <SetRowKindRirHeader
              className="mb-2"
              setLabel={`セット ${idx + 1}`}
              setKind={row.setKind}
              onSetKind={(k) =>
                void updateSet(row.id, { setKind: k as SetKind })
              }
              rir={row.rir ?? null}
              onRir={(r) => void updateSet(row.id, { rir: r })}
              showDelete
              onDelete={() => void removeSet(row.id)}
            />

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
                    label="−10"
                    onClick={() =>
                      void updateSet(row.id, {
                        weightKg: snapWeightToStepKg(row.weightKg - 10, exerciseId),
                      })
                    }
                  />
                  <StepChip
                    label="−5"
                    onClick={() =>
                      void updateSet(row.id, {
                        weightKg: snapWeightToStepKg(row.weightKg - 5, exerciseId),
                      })
                    }
                  />
                  <StepChip
                    label="−2.5"
                    onClick={() =>
                      void updateSet(row.id, {
                        weightKg: snapWeightToStepKg(row.weightKg - 2.5, exerciseId),
                      })
                    }
                  />
                  <StepChip
                    label="+2.5"
                    onClick={() =>
                      void updateSet(row.id, {
                        weightKg: snapWeightToStepKg(row.weightKg + 2.5, exerciseId),
                      })
                    }
                  />
                  <StepChip
                    label="+5"
                    onClick={() =>
                      void updateSet(row.id, {
                        weightKg: snapWeightToStepKg(row.weightKg + 5, exerciseId),
                      })
                    }
                  />
                  <StepChip
                    label="+10"
                    onClick={() =>
                      void updateSet(row.id, {
                        weightKg: snapWeightToStepKg(row.weightKg + 10, exerciseId),
                      })
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
                    label="−10"
                    onClick={() =>
                      void updateSet(row.id, {
                        reps: Math.max(0, row.reps - 10),
                      })
                    }
                  />
                  <StepChip
                    label="−5"
                    onClick={() =>
                      void updateSet(row.id, {
                        reps: Math.max(0, row.reps - 5),
                      })
                    }
                  />
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
                  <StepChip
                    label="+10"
                    onClick={() =>
                      void updateSet(row.id, { reps: row.reps + 10 })
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
