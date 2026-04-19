"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addSet,
  db,
  getOrCreateWorkoutForSessionDate,
  nextOrderForWorkout,
  removeSet,
} from "@/lib/db";
import { ExercisePicker } from "@/components/ExercisePicker";
import { StepChip } from "@/components/StepChip";
import { getExerciseById } from "@/lib/exercises";
import { formatSessionDateJp } from "@/lib/dateKey";
import type { WorkoutSetRow } from "@/lib/types";

type Props = {
  dateKey: string;
};

type DraftRow = {
  id: string;
  weightKg: number;
  reps: number;
};

function clampWeightKg(w: number): number {
  return Math.max(0, Math.round(w * 2) / 2);
}

function newDraftRow(override?: Partial<Pick<DraftRow, "weightKg" | "reps">>): DraftRow {
  return {
    id: crypto.randomUUID(),
    weightKg: 20,
    reps: 10,
    ...override,
  };
}

export function DayRecordClient({ dateKey }: Props) {
  const [workoutId, setWorkoutId] = useState<string | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    null,
  );
  /** まだDBに入れていない、この種目のセット入力（まとめて確定する） */
  const [draftSets, setDraftSets] = useState<DraftRow[]>(() => [
    newDraftRow(),
  ]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getOrCreateWorkoutForSessionDate(dateKey).then((id) => {
      if (!cancelled) setWorkoutId(id);
    });
    return () => {
      cancelled = true;
    };
  }, [dateKey]);

  useEffect(() => {
    setDraftSets([newDraftRow()]);
  }, [selectedExerciseId]);

  const sets = useLiveQuery(
    () =>
      workoutId
        ? db.sets
            .where("workoutId")
            .equals(workoutId)
            .toArray()
            .then((rows) => rows.sort((a, b) => a.order - b.order))
        : Promise.resolve([] as WorkoutSetRow[]),
    [workoutId],
  );

  const exerciseOrder = useMemo(() => {
    const rows = sets ?? [];
    const order: string[] = [];
    const seen = new Set<string>();
    for (const s of rows) {
      if (!seen.has(s.exerciseId)) {
        seen.add(s.exerciseId);
        order.push(s.exerciseId);
      }
    }
    return order;
  }, [sets]);

  const setsByExercise = useMemo(() => {
    const m = new Map<string, WorkoutSetRow[]>();
    for (const s of sets ?? []) {
      const arr = m.get(s.exerciseId) ?? [];
      arr.push(s);
      m.set(s.exerciseId, arr);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => a.order - b.order);
    }
    return m;
  }, [sets]);

  const updateDraft = useCallback((id: string, patch: Partial<DraftRow>) => {
    setDraftSets((rows) =>
      rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  }, []);

  const adjustDraftWeight = useCallback((id: string, delta: number) => {
    setDraftSets((rows) =>
      rows.map((r) =>
        r.id === id
          ? { ...r, weightKg: clampWeightKg(r.weightKg + delta) }
          : r,
      ),
    );
  }, []);

  const adjustDraftReps = useCallback((id: string, delta: number) => {
    setDraftSets((rows) =>
      rows.map((r) =>
        r.id === id
          ? { ...r, reps: Math.max(0, Math.floor(r.reps + delta)) }
          : r,
      ),
    );
  }, []);

  const addDraftRow = useCallback(() => {
    setDraftSets((rows) => {
      const last = rows[rows.length - 1];
      return [
        ...rows,
        newDraftRow(
          last
            ? { weightKg: last.weightKg, reps: last.reps }
            : undefined,
        ),
      ];
    });
  }, []);

  const removeDraftRow = useCallback((id: string) => {
    setDraftSets((rows) =>
      rows.length <= 1 ? rows : rows.filter((r) => r.id !== id),
    );
  }, []);

  const confirmAllDraftSets = useCallback(async () => {
    if (!workoutId || !selectedExerciseId) {
      setErr("種目を選んでください。");
      return;
    }
    if (draftSets.length === 0) {
      setErr("セットを1行以上入力してください。");
      return;
    }
    for (const row of draftSets) {
      if (row.weightKg < 0 || row.reps < 0) {
        setErr("重量と回数は0以上にしてください。");
        return;
      }
    }
    setBusy(true);
    setErr(null);
    try {
      let order = await nextOrderForWorkout(workoutId);
      for (const row of draftSets) {
        await addSet({
          workoutId,
          exerciseId: selectedExerciseId,
          order: order++,
          weightKg: clampWeightKg(row.weightKg),
          reps: Math.floor(row.reps),
        });
      }
      setDraftSets([newDraftRow()]);
    } catch {
      setErr("保存に失敗しました。");
    } finally {
      setBusy(false);
    }
  }, [workoutId, selectedExerciseId, draftSets]);

  const selectedExercise = selectedExerciseId
    ? getExerciseById(selectedExerciseId)
    : undefined;

  const title = formatSessionDateJp(dateKey);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8">
      <header className="flex flex-col gap-3 border-b border-zinc-200 pb-6 dark:border-zinc-700">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link
            href="/"
            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            ← ホーム
          </Link>
          <span className="text-zinc-300 dark:text-zinc-600">|</span>
          <Link
            href="/history"
            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            記録一覧
          </Link>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            トレーニング日
          </p>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {title}
          </h1>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {dateKey}
          </p>
        </div>
      </header>

      <section>
        <h2 className="mb-4 text-lg font-bold text-zinc-900 dark:text-zinc-50">
          この日の記録
        </h2>
        {!sets || sets.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-400">
            まだセットがありません。下で種目を選び、セット分の重量・回数を入れてからまとめて確定してください。
          </p>
        ) : (
          <ul className="flex flex-col gap-6">
            {exerciseOrder.map((exId) => {
              const ex = getExerciseById(exId);
              const rows = setsByExercise.get(exId) ?? [];
              return (
                <li
                  key={exId}
                  className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                    {ex?.name ?? exId}
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {rows.map((row, idx) => (
                      <li
                        key={row.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-zinc-50 px-3 py-2 dark:bg-zinc-800/80"
                      >
                        <span className="font-mono text-sm tabular-nums text-zinc-800 dark:text-zinc-200">
                          セット {idx + 1}：{row.weightKg} kg × {row.reps} 回
                        </span>
                        <button
                          type="button"
                          className="text-xs text-red-600 hover:underline dark:text-red-400"
                          onClick={() => void removeSet(row.id)}
                        >
                          削除
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900 dark:bg-blue-950/20">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
          セットを追加
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          種目を選ぶ → セットごとに重量・回数を入力（行を足して複数セット可）→「この種目のセットをまとめて確定」で一度に保存します。
        </p>

        <div className="mt-4 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              種目
            </h3>
            <ExercisePicker
              onPick={(id) => {
                setSelectedExerciseId(id);
                setErr(null);
              }}
              selectedId={selectedExerciseId}
            />
          </div>

          {selectedExerciseId && selectedExercise && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-600 dark:bg-zinc-900">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <p className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                  {selectedExercise.name}
                </p>
                <button
                  type="button"
                  className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                  onClick={() => setSelectedExerciseId(null)}
                >
                  種目を変える
                </button>
              </div>

              <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
                各セットの重量・回数（セットごとに変えてOK）
              </p>

              <div className="flex flex-col gap-6">
                {draftSets.map((row, index) => (
                  <div
                    key={row.id}
                    className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-4 dark:border-zinc-600 dark:bg-zinc-800/50"
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                        セット {index + 1}
                      </span>
                      {draftSets.length > 1 && (
                        <button
                          type="button"
                          className="text-xs text-red-600 hover:underline dark:text-red-400"
                          onClick={() => removeDraftRow(row.id)}
                        >
                          この行を削除
                        </button>
                      )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <div className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          重量 (kg)
                        </div>
                        <div className="mb-2 text-center font-mono text-2xl font-bold tabular-nums text-zinc-900 dark:text-white">
                          {clampWeightKg(row.weightKg)}
                        </div>
                        <div className="mb-2 flex flex-wrap justify-center gap-1.5">
                          <StepChip
                            label="−10"
                            onClick={() => adjustDraftWeight(row.id, -10)}
                          />
                          <StepChip
                            label="−5"
                            onClick={() => adjustDraftWeight(row.id, -5)}
                          />
                          <StepChip
                            label="−2.5"
                            onClick={() => adjustDraftWeight(row.id, -2.5)}
                          />
                          <StepChip
                            label="+2.5"
                            onClick={() => adjustDraftWeight(row.id, 2.5)}
                          />
                          <StepChip
                            label="+5"
                            onClick={() => adjustDraftWeight(row.id, 5)}
                          />
                          <StepChip
                            label="+10"
                            onClick={() => adjustDraftWeight(row.id, 10)}
                          />
                        </div>
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step={0.5}
                          value={row.weightKg}
                          onChange={(e) =>
                            updateDraft(row.id, {
                              weightKg: clampWeightKg(
                                Number(e.target.value),
                              ),
                            })
                          }
                          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-center font-mono text-sm tabular-nums dark:border-zinc-600 dark:bg-zinc-900"
                          aria-label={`セット${index + 1}の重量`}
                        />
                      </div>

                      <div>
                        <div className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          回数
                        </div>
                        <div className="mb-2 text-center font-mono text-2xl font-bold tabular-nums text-zinc-900 dark:text-white">
                          {Math.floor(row.reps)}
                        </div>
                        <div className="mb-2 flex flex-wrap justify-center gap-1.5">
                          <StepChip
                            label="−10"
                            onClick={() => adjustDraftReps(row.id, -10)}
                          />
                          <StepChip
                            label="−5"
                            onClick={() => adjustDraftReps(row.id, -5)}
                          />
                          <StepChip
                            label="−1"
                            onClick={() => adjustDraftReps(row.id, -1)}
                          />
                          <StepChip
                            label="+1"
                            onClick={() => adjustDraftReps(row.id, 1)}
                          />
                          <StepChip
                            label="+5"
                            onClick={() => adjustDraftReps(row.id, 5)}
                          />
                          <StepChip
                            label="+10"
                            onClick={() => adjustDraftReps(row.id, 10)}
                          />
                        </div>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          step={1}
                          value={row.reps}
                          onChange={(e) =>
                            updateDraft(row.id, {
                              reps: Math.max(
                                0,
                                Math.floor(Number(e.target.value)),
                              ),
                            })
                          }
                          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-center font-mono text-sm tabular-nums dark:border-zinc-600 dark:bg-zinc-900"
                          aria-label={`セット${index + 1}の回数`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addDraftRow}
                className="mt-4 w-full rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                ＋ セット行を追加
              </button>

              <button
                type="button"
                disabled={busy || !workoutId}
                onClick={() => void confirmAllDraftSets()}
                className="mt-4 w-full rounded-2xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white shadow hover:bg-blue-500 disabled:opacity-50"
              >
                この種目のセットをまとめて確定
              </button>
            </div>
          )}

          {!selectedExerciseId && (
            <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
              上の一覧から種目を選ぶと、入力フォームが表示されます。
            </p>
          )}
        </div>

        {err && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{err}</p>
        )}
      </section>
    </div>
  );
}
