"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  createCustomExercise,
  loadExerciseCatalog,
  saveExerciseCatalog,
  type ExerciseCatalogState,
} from "@/lib/exerciseCatalog";
import { getBaseDefaultWeightKgForExercise } from "@/lib/defaultWeightKg";
import {
  getAllExercises,
  getCategoryLabel,
  listCategories,
} from "@/lib/exercises";
import {
  getWeightSelectOptionsForExercise,
  snapWeightToStepKg,
} from "@/lib/recordBodyTabs";
import type { ExerciseCategory, ExerciseMaster } from "@/lib/types";

function groupByCategory(list: ExerciseMaster[]): Map<ExerciseCategory, ExerciseMaster[]> {
  const m = new Map<ExerciseCategory, ExerciseMaster[]>();
  for (const c of listCategories().map((x) => x.id)) {
    m.set(c, []);
  }
  for (const ex of list) {
    m.get(ex.category)?.push(ex);
  }
  return m;
}

export function ExerciseCatalogSection() {
  const [state, setState] = useState<ExerciseCatalogState | null>(null);
  const [newName, setNewName] = useState("");
  const [newCat, setNewCat] = useState<ExerciseCategory>("chest");
  const [newArm, setNewArm] = useState<"bicep" | "tricep">("bicep");
  const [openCat, setOpenCat] = useState<ExerciseCategory | null>("chest");

  useEffect(() => {
    setState(loadExerciseCatalog());
  }, []);

  const persist = useCallback((next: ExerciseCatalogState) => {
    setState(next);
    saveExerciseCatalog(next);
  }, []);

  const builtin = useMemo(() => getAllExercises(), []);
  const grouped = useMemo(() => groupByCategory(builtin), [builtin]);

  const toggleBuiltin = (id: string) => {
    if (!state) return;
    const on = !state.disabledIds.includes(id);
    const disabledIds = on
      ? [...state.disabledIds, id]
      : state.disabledIds.filter((x) => x !== id);
    persist({ ...state, disabledIds });
  };

  const addCustom = () => {
    if (!state) return;
    const name = newName.trim();
    if (!name) return;
    const ex = createCustomExercise({
      name,
      category: newCat,
      armFocus: newCat === "arms" ? newArm : undefined,
    });
    persist({ ...state, custom: [...state.custom, ex] });
    setNewName("");
  };

  const removeCustom = (id: string) => {
    if (!state) return;
    const restDefaultWeightKgById = { ...state.defaultWeightKgById };
    delete restDefaultWeightKgById[id];
    persist({
      ...state,
      custom: state.custom.filter((c) => c.id !== id),
      disabledIds: state.disabledIds.filter((x) => x !== id),
      defaultWeightKgById: restDefaultWeightKgById,
    });
  };

  const defaultWeightForExercise = useCallback(
    (exerciseId: string): number => {
      if (!state) return getBaseDefaultWeightKgForExercise(exerciseId);
      const overridden = state.defaultWeightKgById[exerciseId];
      if (typeof overridden === "number" && Number.isFinite(overridden)) {
        return snapWeightToStepKg(overridden, exerciseId);
      }
      return getBaseDefaultWeightKgForExercise(exerciseId);
    },
    [state],
  );

  const updateDefaultWeight = useCallback(
    (exerciseId: string, weightKg: number) => {
      if (!state) return;
      const snapped = snapWeightToStepKg(weightKg, exerciseId);
      persist({
        ...state,
        defaultWeightKgById: {
          ...state.defaultWeightKgById,
          [exerciseId]: snapped,
        },
      });
    },
    [persist, state],
  );

  const clearAllHidden = () => {
    if (!state) return;
    persist({ ...state, disabledIds: [] });
  };

  if (!state) {
    return (
      <section className="mt-10 border-t border-zinc-200 pt-8 dark:border-zinc-800">
        <p className="text-sm text-zinc-500">読み込み中…</p>
      </section>
    );
  }

  return (
    <section className="mt-10 border-t border-zinc-200 pt-8 dark:border-zinc-800">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        記録で使う種目
      </h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        表示する種目を減らしたり、オリジナル種目を追加できます。非表示にしても、過去の記録の名前はそのまま表示されます。
      </p>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        ここで各種目のデフォルト重量も変更できます。
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={clearAllHidden}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
        >
          非表示をすべて解除
        </button>
      </div>

      <div className="mt-6 space-y-3">
        {listCategories().map(({ id: cat }) => {
          const items = grouped.get(cat) ?? [];
          if (items.length === 0) return null;
          const open = openCat === cat;
          return (
            <div
              key={cat}
              className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700"
            >
              <button
                type="button"
                onClick={() => setOpenCat(open ? null : cat)}
                className="flex w-full items-center justify-between bg-zinc-50 px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:bg-zinc-900/80 dark:text-zinc-50"
              >
                <span>{getCategoryLabel(cat)}</span>
                <span className="text-zinc-400">{open ? "▼" : "▶"}</span>
              </button>
              {open && (
                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {items.map((ex) => {
                    const hidden = state.disabledIds.includes(ex.id);
                    const defaultWeight = defaultWeightForExercise(ex.id);
                    const weightOptions = getWeightSelectOptionsForExercise(ex.id);
                    return (
                      <li
                        key={ex.id}
                        className="flex min-w-0 flex-wrap items-center justify-between gap-3 px-4 py-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="block min-w-0 truncate text-sm text-zinc-800 dark:text-zinc-200">
                            {ex.name}
                          </span>
                          <label className="mt-2 flex max-w-[220px] items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                            <span className="shrink-0">初期重量</span>
                            <select
                              value={defaultWeight}
                              onChange={(e) =>
                                updateDefaultWeight(ex.id, Number(e.target.value))
                              }
                              className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
                            >
                              {weightOptions.map((w) => (
                                <option key={w} value={w}>
                                  {w % 1 === 0 ? w : w.toFixed(1)} kg
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <label className="flex shrink-0 items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                          <span>{hidden ? "非表示" : "表示"}</span>
                          <input
                            type="checkbox"
                            checked={!hidden}
                            onChange={() => toggleBuiltin(ex.id)}
                            className="h-4 w-4 rounded border-zinc-300"
                          />
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-xl border border-dashed border-orange-300/80 bg-orange-50/40 p-4 dark:border-orange-800/60 dark:bg-orange-950/20">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          カスタム種目
        </h3>
        {state.custom.length > 0 && (
          <ul className="mt-3 space-y-2">
            {state.custom.map((ex) => (
              <li
                key={ex.id}
                className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-lg bg-white/80 px-3 py-2 dark:bg-zinc-900/60"
              >
                <div className="min-w-0 flex-1">
                  <span className="min-w-0 truncate text-sm">
                    <span className="font-medium text-zinc-900 dark:text-zinc-50">
                      {ex.name}
                    </span>
                    <span className="ml-2 text-xs text-zinc-500">
                      {getCategoryLabel(ex.category)}
                    </span>
                  </span>
                  <label className="mt-2 flex max-w-[220px] items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                    <span className="shrink-0">初期重量</span>
                    <select
                      value={defaultWeightForExercise(ex.id)}
                      onChange={(e) =>
                        updateDefaultWeight(ex.id, Number(e.target.value))
                      }
                      className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
                    >
                      {getWeightSelectOptionsForExercise(ex.id).map((w) => (
                        <option key={w} value={w}>
                          {w % 1 === 0 ? w : w.toFixed(1)} kg
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => removeCustom(ex.id)}
                  className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block min-w-0 flex-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">種目名</span>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="例: マシンチェスト"
              className="mt-1 w-full min-w-0 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">部位</span>
            <select
              value={newCat}
              onChange={(e) =>
                setNewCat(e.target.value as ExerciseCategory)
              }
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
            >
              {listCategories().map(({ id, label }) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {newCat === "arms" && (
            <label className="block text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">腕</span>
              <select
                value={newArm}
                onChange={(e) =>
                  setNewArm(e.target.value as "bicep" | "tricep")
                }
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
              >
                <option value="bicep">二頭</option>
                <option value="tricep">三頭</option>
              </select>
            </label>
          )}
          <button
            type="button"
            onClick={addCustom}
            className={clsx(
              "rounded-xl px-4 py-2.5 text-sm font-semibold text-white",
              "bg-orange-600 hover:bg-orange-500 dark:bg-orange-700 dark:hover:bg-orange-600",
            )}
          >
            追加
          </button>
        </div>
      </div>
    </section>
  );
}
