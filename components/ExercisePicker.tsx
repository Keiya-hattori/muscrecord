"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import type { ExerciseCategory } from "@/lib/types";
import {
  getAllExercises,
  getCategoryLabel,
  listCategories,
} from "@/lib/exercises";
import {
  loadExercisePickerFromStorage,
  saveExercisePickerToStorage,
} from "@/lib/uiPersist";

type Props = {
  /** 選択時（同じ種目でも呼ぶ） */
  onPick: (exerciseId: string) => void;
  selectedId?: string | null;
};

export function ExercisePicker({ onPick, selectedId }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ExerciseCategory | "all">("all");
  const [pickerReady, setPickerReady] = useState(false);

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
    let list = getAllExercises();
    if (category !== "all") list = list.filter((e) => e.category === category);
    const q = query.trim().toLowerCase();
    if (q)
      list = list.filter((e) => e.name.toLowerCase().includes(q));
    return list;
  }, [category, query]);

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
        {filtered.map((ex) => (
          <li key={ex.id}>
            <button
              type="button"
              onClick={() => onPick(ex.id)}
              className={clsx(
                "flex w-full flex-col overflow-hidden rounded-2xl border-2 text-left transition active:scale-[0.98]",
                selectedId === ex.id
                  ? "border-blue-600 ring-2 ring-blue-500/30"
                  : "border-transparent bg-white shadow-md hover:border-blue-300 dark:bg-zinc-900 dark:hover:border-blue-600",
              )}
            >
              <div className="relative aspect-square w-full bg-zinc-100 dark:bg-zinc-800">
                <Image
                  src={ex.imagePath}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width:768px) 50vw, 25vw"
                />
              </div>
              <span className="px-2 py-3 text-center text-sm font-semibold leading-tight text-zinc-900 dark:text-zinc-50">
                {ex.name}
              </span>
              <span className="pb-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
                {getCategoryLabel(ex.category)}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-zinc-500">
          該当する種目がありません。
        </p>
      )}
    </div>
  );
}
