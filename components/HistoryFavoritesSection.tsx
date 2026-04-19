"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { ExerciseCover } from "@/components/ExerciseCover";
import { getAllExercises, getCategoryLabel } from "@/lib/exercises";
import {
  DEFAULT_HISTORY_FAVORITE_IDS,
  getEffectiveFavoriteIds,
  loadHistoryFavoriteIds,
  saveHistoryFavoriteIds,
} from "@/lib/historyFavorites";
import {
  RECORD_BODY_TABS,
  exercisesForRecordTab,
  type RecordBodyTabId,
} from "@/lib/recordBodyTabs";
import type { ExerciseCategory, ExerciseMaster } from "@/lib/types";

export function HistoryFavoritesSection() {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [bodyTab, setBodyTab] = useState<RecordBodyTabId>("chest");

  useEffect(() => {
    setFavoriteIds(getEffectiveFavoriteIds(loadHistoryFavoriteIds()));
    setLoaded(true);
  }, []);

  const allMaster = useMemo(() => getAllExercises(), []);

  const persist = useCallback((next: string[]) => {
    setFavoriteIds(next);
    saveHistoryFavoriteIds(next);
  }, []);

  const remove = useCallback(
    (id: string) => {
      persist(favoriteIds.filter((x) => x !== id));
    },
    [favoriteIds, persist],
  );

  const add = useCallback(
    (id: string) => {
      if (favoriteIds.includes(id)) return;
      persist([...favoriteIds, id]);
    },
    [favoriteIds, persist],
  );

  const resetDefaults = useCallback(() => {
    persist([...DEFAULT_HISTORY_FAVORITE_IDS]);
  }, [persist]);

  const exercisesInTab = useMemo(() => {
    const list = exercisesForRecordTab(bodyTab, allMaster);
    return list;
  }, [bodyTab, allMaster]);

  const favoriteExercises: ExerciseMaster[] = useMemo(() => {
    const byId = new Map(allMaster.map((e) => [e.id, e]));
    return favoriteIds
      .map((id) => byId.get(id))
      .filter((e): e is ExerciseMaster => e != null);
  }, [favoriteIds, allMaster]);

  if (!loaded) {
    return (
      <section className="mt-10 border-t border-zinc-200 pt-8 dark:border-zinc-800">
        <p className="text-sm text-zinc-500">読み込み中…</p>
      </section>
    );
  }

  return (
    <section
      id="history-favorites"
      className="mt-10 border-t border-zinc-200 pt-8 dark:border-zinc-800"
    >
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        種目別記録のお気に入り
      </h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        種目別の記録ページに表示するショートカットです。デフォルトの4種もここから削除できます。
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={resetDefaults}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
        >
          デフォルト4種に戻す
        </button>
      </div>

      <div className="mt-6">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          お気に入りに入っている種目
        </p>
        {favoriteExercises.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">まだありません</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {favoriteExercises.map((ex) => (
              <li
                key={ex.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900/50"
              >
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {ex.name}
                  <span className="ml-2 text-xs text-zinc-500">
                    {getCategoryLabel(ex.category)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => remove(ex.id)}
                  className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  外す
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-8">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          種目を追加（マスタ一覧）
        </p>
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
          {RECORD_BODY_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setBodyTab(t.id)}
              className={clsx(
                "min-h-[40px] rounded-xl border-2 px-1 py-2 text-center text-xs font-semibold transition",
                bodyTab === t.id
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {exercisesInTab.map((ex) => {
            const on = favoriteIds.includes(ex.id);
            return (
              <button
                key={ex.id}
                type="button"
                disabled={on}
                onClick={() => add(ex.id)}
                className={clsx(
                  "flex items-center gap-2 rounded-xl border px-2 py-2 text-left text-sm transition",
                  on
                    ? "cursor-not-allowed border-zinc-100 opacity-50 dark:border-zinc-800"
                    : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:hover:bg-zinc-800",
                )}
              >
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg">
                  <ExerciseCover exercise={ex} />
                </div>
                <span className="max-w-[8rem] leading-tight">{ex.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
