"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import type { ExerciseCategory } from "@/lib/types";
import { useRecordableExercises } from "@/hooks/useRecordableExercises";
import { getCategoryLabel, listCategories } from "@/lib/exercises";
import { ExerciseCover } from "@/components/ExerciseCover";
import {
  loadExercisePickerFromStorage,
  saveExercisePickerToStorage,
} from "@/lib/uiPersist";

type SingleProps = {
  mode?: "single";
  onPick: (exerciseId: string) => void;
  selectedId?: string | null;
};

type MultiProps = {
  mode: "multi";
  selectedIds: ReadonlySet<string>;
  onToggle: (exerciseId: string) => void;
};

type Props = SingleProps | MultiProps;

export function ExercisePicker(props: Props) {
  const isMulti = props.mode === "multi";
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ExerciseCategory | "all">("all");
  const [pickerReady, setPickerReady] = useState(false);
  const allFromCatalog = useRecordableExercises();

  useEffect(() => {
    const s = loadExercisePickerFromStorage();
    if (s) {
      setQuery(s.query);
      setCategory(s.category);
    }
    setPickerReady(true);
  }, []);

  useEffect(() => {
    if (!pickerReady) return;
    saveExercisePickerToStorage({ query, category });
  }, [query, category, pickerReady]);

  const filtered = useMemo(() => {
    let list = allFromCatalog;
    if (category !== "all") list = list.filter((e) => e.category === category);
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((e) => e.name.toLowerCase().includes(q));
    return list;
  }, [category, query, allFromCatalog]);

  return (
    <div className="flex flex-col gap-4">
      <input
        type="search"
        placeholder="種目を検索…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-900 placeholder:text-zinc-400 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategory("all")}
          className={clsx(
            "rounded-full px-4 py-1.5 text-sm font-medium transition",
            category === "all"
              ? "bg-blue-600 text-white"
              : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700",
          )}
        >
          すべて
        </button>
        {listCategories().map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            className={clsx(
              "rounded-full px-4 py-1.5 text-sm font-medium transition",
              category === c.id
                ? "bg-blue-600 text-white"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {filtered.map((ex) => {
          const selectedSingle = !isMulti && props.selectedId === ex.id;
          const selectedMulti = isMulti && props.selectedIds.has(ex.id);
          const selected = selectedSingle || selectedMulti;
          return (
            <li key={ex.id} className="min-w-0">
              <button
                type="button"
                onClick={() =>
                  isMulti ? props.onToggle(ex.id) : props.onPick(ex.id)
                }
                className={clsx(
                  "relative flex w-full min-w-0 flex-col overflow-hidden rounded-2xl border-2 text-left transition active:scale-[0.98]",
                  selected
                    ? "border-blue-600 ring-2 ring-blue-500/30"
                    : "border-transparent bg-white shadow-md hover:border-blue-300 dark:bg-zinc-900 dark:hover:border-blue-600",
                )}
              >
                {isMulti && selectedMulti && (
                  <span className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-md">
                    ✓
                  </span>
                )}
                <div className="relative aspect-square w-full min-h-0 overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                  <ExerciseCover exercise={ex} />
                </div>
                <span className="px-2 py-3 text-center text-sm font-semibold leading-tight text-zinc-900 dark:text-zinc-50">
                  {ex.name}
                </span>
                <span className="pb-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
                  {getCategoryLabel(ex.category)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-zinc-500">
          該当する種目がありません。
        </p>
      )}
    </div>
  );
}
