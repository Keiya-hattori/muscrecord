"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import clsx from "clsx";
import {
  addSet,
  db,
  getOrCreateWorkoutForSessionDate,
  markPendingLlmRowApplied,
  nextOrderForWorkout,
  removeSet,
  setWorkoutPendingLlmMenu,
} from "@/lib/db";
import { AppNav } from "@/components/AppNav";
import { ExerciseCover } from "@/components/ExerciseCover";
import { getAllExercises, getExerciseById } from "@/lib/exercises";
import {
  DEFAULT_REPS_FOR_NEW_SET,
  getDefaultWeightKgForExercise,
} from "@/lib/defaultWeightKg";
import {
  parsePendingMenuJson,
  type PendingLlmMenuPayload,
  type PendingLlmMenuRow,
} from "@/lib/pendingLlmMenu";
import {
  RECORD_BODY_TABS,
  REP_SELECT_OPTIONS,
  WEIGHT_SELECT_OPTIONS,
  exercisesForRecordTab,
  recordTabForExercise,
  snapWeightToStepKg,
  type RecordBodyTabId,
} from "@/lib/recordBodyTabs";
import {
  countDistinctExercises,
  maxOtherExerciseVolumeKg,
  maxOtherWorkoutVolumeKg,
  totalVolumeKg,
  volumeByExerciseInSets,
} from "@/lib/dayRecordAchievements";
import type { WorkoutSetRow } from "@/lib/types";

type Props = {
  dateKey: string;
};

type DraftRow = {
  id: string;
  weightKg: number;
  reps: number;
};

function newDraftRow(
  override?: Partial<Pick<DraftRow, "weightKg" | "reps">> & {
    defaultExerciseId?: string;
  },
): DraftRow {
  const { defaultExerciseId, ...rest } = override ?? {};
  const baseW = defaultExerciseId
    ? getDefaultWeightKgForExercise(defaultExerciseId)
    : snapWeightToStepKg(40);
  return {
    id: crypto.randomUUID(),
    weightKg: rest.weightKg ?? baseW,
    reps: rest.reps ?? DEFAULT_REPS_FOR_NEW_SET,
  };
}

export function DayRecordClient({ dateKey }: Props) {
  const router = useRouter();
  const [workoutId, setWorkoutId] = useState<string | null>(null);
  const [bodyTab, setBodyTab] = useState<RecordBodyTabId>("chest");
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    null,
  );
  const [draftSets, setDraftSets] = useState<DraftRow[]>(() => [
    newDraftRow(),
  ]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [suggestTodoOpen, setSuggestTodoOpen] = useState(true);

  const inputSectionRef = useRef<HTMLDivElement>(null);

  const allExercises = useMemo(() => getAllExercises(), []);
  const exercisesInTab = useMemo(
    () => exercisesForRecordTab(bodyTab, allExercises),
    [bodyTab, allExercises],
  );

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
    if (!selectedExerciseId) return;
    setDraftSets([
      newDraftRow({ defaultExerciseId: selectedExerciseId }),
    ]);
  }, [selectedExerciseId]);

  useEffect(() => {
    setSelectedExerciseId(null);
  }, [bodyTab]);

  useEffect(() => {
    if (selectedExerciseId && inputSectionRef.current) {
      inputSectionRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [selectedExerciseId]);

  const workoutRow = useLiveQuery(
    () => (workoutId ? db.workouts.get(workoutId) : undefined),
    [workoutId],
  );

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

  const pendingMenu = useMemo(
    () => parsePendingMenuJson(workoutRow?.pendingLlmMenuJson),
    [workoutRow?.pendingLlmMenuJson],
  );

  const rowsByBodyTab = useMemo(() => {
    const map = new Map<RecordBodyTabId, PendingLlmMenuRow[]>();
    for (const t of RECORD_BODY_TABS) {
      map.set(t.id, []);
    }
    if (!pendingMenu) return map;
    for (const row of pendingMenu.rows) {
      const ex = getExerciseById(row.exerciseId);
      if (!ex) continue;
      const tab = recordTabForExercise(ex);
      const list = map.get(tab) ?? [];
      list.push(row);
      map.set(tab, list);
    }
    return map;
  }, [pendingMenu]);

  const allSetsForStats = useLiveQuery(() => db.sets.toArray(), []);

  const sessionHighlights = useMemo(() => {
    const list = sets ?? [];
    if (list.length === 0 || !workoutId) return null;
    const vol = totalVolumeKg(list);
    const setCount = list.length;
    const exCount = countDistinctExercises(list);
    const statsReady = Array.isArray(allSetsForStats);
    if (!statsReady) {
      return {
        vol,
        maxHistoricSession: 0,
        isSessionVolumePR: false,
        setCount,
        exCount,
        exercisePRs: [] as {
          exerciseId: string;
          label: string;
          volume: number;
          isVolumePR: boolean;
        }[],
        encouragement: "記録してくれてありがとう。調子は数字に表れます。",
        statsReady: false,
      };
    }
    const maxHistoricSession = maxOtherWorkoutVolumeKg(
      allSetsForStats,
      workoutId,
    );
    const isSessionVolumePR = vol > maxHistoricSession;
    const byEx = volumeByExerciseInSets(list);
    const exercisePRs: {
      exerciseId: string;
      label: string;
      volume: number;
      isVolumePR: boolean;
    }[] = [];
    for (const [exerciseId, v] of byEx) {
      const pastMax = maxOtherExerciseVolumeKg(
        allSetsForStats,
        exerciseId,
        workoutId,
      );
      exercisePRs.push({
        exerciseId,
        label: getExerciseById(exerciseId)?.name ?? exerciseId,
        volume: v,
        isVolumePR: v > pastMax,
      });
    }
    exercisePRs.sort((a, b) => b.volume - a.volume);
    const encouragement =
      isSessionVolumePR
        ? "セッションの総ボリュームが過去最高です。"
        : vol >= maxHistoricSession * 0.85 && maxHistoricSession > 0
          ? "いつもに近い高めのボリューム。安定してます！"
          : setCount >= 8
            ? "セット数もばっちり。今日も積み上げました。"
            : "一歩ずつが強さになります。今日もえらい！";
    return {
      vol,
      maxHistoricSession,
      isSessionVolumePR,
      setCount,
      exCount,
      exercisePRs,
      encouragement,
      statsReady: true,
    };
  }, [sets, workoutId, allSetsForStats]);

  const removePendingRow = useCallback(
    async (rowId: string) => {
      if (!workoutId || !pendingMenu) return;
      const nextRows = pendingMenu.rows.filter((r) => r.id !== rowId);
      const nextPayload: PendingLlmMenuPayload | null =
        nextRows.length > 0
          ? { title: pendingMenu.title, rows: nextRows }
          : null;
      await setWorkoutPendingLlmMenu(workoutId, nextPayload);
    },
    [workoutId, pendingMenu],
  );

  const confirmTodoRow = useCallback(
    async (row: PendingLlmMenuRow) => {
      if (!workoutId || row.applied) return;
      setBusy(true);
      setErr(null);
      try {
        const order = await nextOrderForWorkout(workoutId);
        await addSet({
          workoutId,
          exerciseId: row.exerciseId,
          order,
          weightKg: snapWeightToStepKg(row.weightKg),
          reps: Math.min(50, Math.max(0, Math.floor(row.reps))),
        });
        await markPendingLlmRowApplied(workoutId, row.id);
      } catch {
        setErr("ToDo からの追加に失敗しました。");
      } finally {
        setBusy(false);
      }
    },
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

  const addDraftRow = useCallback(() => {
    setDraftSets((rows) => {
      const last = rows[rows.length - 1];
      return [
        ...rows,
        newDraftRow(
          last
            ? {
                weightKg: snapWeightToStepKg(last.weightKg),
                reps: Math.min(50, Math.max(0, Math.floor(last.reps))),
              }
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
          weightKg: snapWeightToStepKg(row.weightKg),
          reps: Math.min(50, Math.max(0, Math.floor(row.reps))),
        });
      }
      setDraftSets([
        newDraftRow({ defaultExerciseId: selectedExerciseId }),
      ]);
    } catch {
      setErr("保存に失敗しました。");
    } finally {
      setBusy(false);
    }
  }, [workoutId, selectedExerciseId, draftSets]);

  const selectedExercise = selectedExerciseId
    ? getExerciseById(selectedExerciseId)
    : undefined;

  const selectWheelClass =
    "h-14 w-full appearance-none rounded-xl border border-zinc-200 bg-white px-3 text-center text-base font-semibold tabular-nums shadow-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50";

  return (
    <>
      <AppNav />

      <div className="mx-auto max-w-4xl px-4 pb-36 pt-4">
        <header className="border-b border-zinc-200 pb-4 dark:border-zinc-700">
          <Link
            href="/"
            className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            ← ホーム
          </Link>
        </header>

        {/* LLM 提案 ToDo（部位別・チェック後も行は残す） */}
        {pendingMenu && pendingMenu.rows.length > 0 && (
          <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20">
            <button
              type="button"
              onClick={() => setSuggestTodoOpen((o) => !o)}
              className="flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left"
              aria-expanded={suggestTodoOpen}
            >
              <div>
                <p className="text-xs font-medium text-amber-900 dark:text-amber-100/90">
                  提案メニュー（ToDo）
                </p>
                <p className="mt-0.5 text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  {pendingMenu.title ?? "今日のメニュー"}
                  <span className="ml-2 font-semibold text-amber-800 dark:text-amber-200">
                    （完了 {pendingMenu.rows.filter((r) => r.applied).length} /{" "}
                    {pendingMenu.rows.length} セット）
                  </span>
                </p>
              </div>
              <span className="text-lg text-zinc-500" aria-hidden>
                {suggestTodoOpen ? "▲" : "▼"}
              </span>
            </button>
            {suggestTodoOpen && (
              <div className="space-y-4 border-t border-amber-200/80 px-3 pb-4 pt-3 dark:border-amber-900/50">
                {RECORD_BODY_TABS.map((tab) => {
                  const rows = rowsByBodyTab.get(tab.id) ?? [];
                  if (rows.length === 0) return null;
                  return (
                    <div key={tab.id}>
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-amber-950/90 dark:text-amber-100/90">
                        {tab.label}
                      </p>
                      <ul className="space-y-2">
                        {rows.map((row) => {
                          const ex = getExerciseById(row.exerciseId);
                          return (
                            <li
                              key={row.id}
                              className={clsx(
                                "flex flex-wrap items-center gap-3 rounded-xl px-3 py-2.5 transition",
                                row.applied
                                  ? "border border-emerald-300/70 bg-emerald-50/90 dark:border-emerald-800/60 dark:bg-emerald-950/35"
                                  : "border border-zinc-200/80 bg-white/90 dark:border-zinc-600 dark:bg-zinc-900/90",
                              )}
                            >
                              <label
                                className={clsx(
                                  "flex min-w-0 flex-1 items-center gap-2",
                                  row.applied ? "cursor-default" : "cursor-pointer",
                                )}
                              >
                                <input
                                  type="checkbox"
                                  className="h-5 w-5 shrink-0 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 disabled:opacity-60"
                                  checked={!!row.applied}
                                  disabled={busy || row.applied}
                                  onChange={(e) => {
                                    if (e.target.checked && !row.applied) {
                                      void confirmTodoRow(row);
                                    }
                                  }}
                                />
                                <span className="min-w-0 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                                  <span
                                    className={clsx(
                                      "font-semibold",
                                      row.applied &&
                                        "text-emerald-900 dark:text-emerald-100",
                                    )}
                                  >
                                    {ex?.name ?? row.exerciseId}
                                  </span>
                                  <span
                                    className={clsx(
                                      "ml-2 font-mono text-sm tabular-nums text-zinc-600 dark:text-zinc-300",
                                      row.applied && "text-emerald-800 dark:text-emerald-200/90",
                                    )}
                                  >
                                    {snapWeightToStepKg(row.weightKg)} kg ×{" "}
                                    {row.reps} 回
                                  </span>
                                  {row.applied && (
                                    <span className="ml-2 inline-block rounded-md bg-emerald-600/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-400/20 dark:text-emerald-100">
                                      記録へ反映済み
                                    </span>
                                  )}
                                </span>
                              </label>
                              <button
                                type="button"
                                disabled={busy}
                                className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                                onClick={() => void removePendingRow(row.id)}
                              >
                                削除
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* 部位タブ */}
        <section className="mt-6">
          <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            部位を選ぶ
          </p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {RECORD_BODY_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setBodyTab(t.id)}
                className={clsx(
                  "min-h-[44px] rounded-xl border-2 px-1 py-2.5 text-center text-sm font-semibold leading-tight transition active:scale-[0.98]",
                  bodyTab === t.id
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </section>

        {/* 種目アイコン（横スクロール） */}
        <section className="mt-6">
          <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            種目をタップ
          </p>
          {exercisesInTab.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-300 px-3 py-6 text-center text-sm text-zinc-500 dark:border-zinc-600">
              この部位の種目がありません。
            </p>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch]">
              {exercisesInTab.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => {
                    setSelectedExerciseId(ex.id);
                    setErr(null);
                  }}
                  className={clsx(
                    "flex w-[76px] shrink-0 flex-col items-center gap-1 rounded-xl p-2 transition active:scale-[0.97]",
                    selectedExerciseId === ex.id
                      ? "bg-blue-100 ring-2 ring-blue-500 dark:bg-blue-950/60"
                      : "bg-white shadow ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-600",
                  )}
                >
                  <div className="relative h-12 w-12 overflow-hidden rounded-lg">
                    <ExerciseCover exercise={ex} />
                  </div>
                  <span className="line-clamp-2 w-full text-center text-[10px] font-medium leading-tight text-zinc-800 dark:text-zinc-200">
                    {ex.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* 重量・回数（ネイティブ select でホイール／プルダウン操作向け） */}
        <section ref={inputSectionRef} className="mt-8 scroll-mt-8">
          <h2 className="mb-3 text-lg font-bold text-zinc-900 dark:text-zinc-50">
            セット入力
          </h2>

          {selectedExerciseId && selectedExercise && (
            <div className="rounded-2xl border border-blue-200 bg-white p-4 dark:border-blue-900/40 dark:bg-zinc-900">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <p className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                  {selectedExercise.name}
                </p>
                <button
                  type="button"
                  className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                  onClick={() => setSelectedExerciseId(null)}
                >
                  種目をクリア
                </button>
              </div>

              <div className="flex flex-col gap-5">
                {draftSets.map((row, index) => {
                  const wVal = snapWeightToStepKg(row.weightKg);
                  const rVal = Math.min(
                    50,
                    Math.max(0, Math.floor(row.reps)),
                  );
                  return (
                    <div
                      key={row.id}
                      className="rounded-xl border border-zinc-100 bg-zinc-50/90 p-4 dark:border-zinc-600 dark:bg-zinc-800/40"
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
                            削除
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label
                            className="mb-1 block text-center text-xs font-medium text-zinc-500"
                            htmlFor={`w-${row.id}`}
                          >
                            重量 (kg)
                          </label>
                          <select
                            id={`w-${row.id}`}
                            className={selectWheelClass}
                            value={wVal}
                            onChange={(e) =>
                              updateDraft(row.id, {
                                weightKg: Number(e.target.value),
                              })
                            }
                          >
                            {WEIGHT_SELECT_OPTIONS.map((w) => (
                              <option key={w} value={w}>
                                {w % 1 === 0 ? w : w.toFixed(1)} kg
                              </option>
                            ))}
                          </select>
                          <p className="mt-1 text-center text-[10px] text-zinc-400">
                            タップしてスクロール選択（端末の標準UI）
                          </p>
                        </div>
                        <div>
                          <label
                            className="mb-1 block text-center text-xs font-medium text-zinc-500"
                            htmlFor={`r-${row.id}`}
                          >
                            回数
                          </label>
                          <select
                            id={`r-${row.id}`}
                            className={selectWheelClass}
                            value={rVal}
                            onChange={(e) =>
                              updateDraft(row.id, {
                                reps: Number(e.target.value),
                              })
                            }
                          >
                            {REP_SELECT_OPTIONS.map((r) => (
                              <option key={r} value={r}>
                                {r} 回
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={addDraftRow}
                className="mt-4 w-full rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                ＋ セットを追加
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
            <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-600 dark:text-zinc-400">
              上から部位 → 種目を選ぶと、ここに重量・回数を入れられます。
            </p>
          )}

          {err && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">
              {err}
            </p>
          )}
        </section>

        {/* この日の一覧（入力の下） */}
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-bold text-zinc-900 dark:text-zinc-50">
            この日の記録
          </h2>
          {!sets || sets.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-10 text-center text-sm text-zinc-500 dark:border-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-400">
              まだセットがありません。上の手順で入力して確定してください。
            </p>
          ) : (
            <div className="flex flex-col gap-6">
              {sessionHighlights && (
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-[1px] shadow-lg shadow-indigo-500/25">
                  <div className="rounded-[1.4rem] bg-gradient-to-br from-indigo-600/95 via-violet-600/95 to-fuchsia-600/95 p-5 text-white">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-white/80">
                          セッション総ボリューム
                        </p>
                        <p className="mt-1 text-4xl font-black tabular-nums tracking-tight drop-shadow-sm">
                          {Math.round(sessionHighlights.vol).toLocaleString("ja-JP")}
                          <span className="ml-1 text-xl font-bold">kg</span>
                        </p>
                        <p className="mt-2 max-w-[20rem] text-sm leading-snug text-white/85">
                          重量×回数の合計。数字が大きいほど今日の負荷量の目安になります。
                        </p>
                      </div>
                      {sessionHighlights.statsReady &&
                        sessionHighlights.isSessionVolumePR && (
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="rounded-full bg-yellow-300 px-3 py-1 text-center text-xs font-black text-amber-950 shadow-md">
                            自己新記録！
                          </span>
                          <span className="text-2xl" aria-hidden>
                            🏆
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="mt-4 rounded-xl bg-black/15 px-3 py-2 text-sm font-medium leading-relaxed text-white/95">
                      {sessionHighlights.encouragement}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 text-sm">
                      <span className="rounded-full bg-white/20 px-3 py-1 font-semibold backdrop-blur-sm">
                        セット {sessionHighlights.setCount}
                      </span>
                      <span className="rounded-full bg-white/20 px-3 py-1 font-semibold backdrop-blur-sm">
                        種目 {sessionHighlights.exCount}
                      </span>
                      {sessionHighlights.statsReady &&
                        !sessionHighlights.isSessionVolumePR &&
                        sessionHighlights.maxHistoricSession > 0 && (
                          <span className="rounded-full bg-white/10 px-3 py-1 text-white/80">
                            過去の最高{" "}
                            {Math.round(
                              sessionHighlights.maxHistoricSession,
                            ).toLocaleString("ja-JP")}{" "}
                            kg
                          </span>
                        )}
                    </div>
                  </div>
                </div>
              )}

              <ul className="flex flex-col gap-5">
                {exerciseOrder.map((exId) => {
                  const ex = getExerciseById(exId);
                  const rows = setsByExercise.get(exId) ?? [];
                  const prRow = sessionHighlights?.exercisePRs.find(
                    (e) => e.exerciseId === exId,
                  );
                  const exVol = prRow?.volume ?? 0;
                  return (
                    <li
                      key={exId}
                      className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-gradient-to-b from-white to-zinc-50/90 shadow-md shadow-zinc-200/50 dark:border-zinc-700 dark:from-zinc-900 dark:to-zinc-950 dark:shadow-black/40"
                    >
                      <div className="flex gap-3 border-b border-zinc-100 bg-white/90 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/80">
                        {ex && (
                          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800">
                            <ExerciseCover exercise={ex} imageSizes="56px" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                              {ex?.name ?? exId}
                            </h3>
                            {sessionHighlights?.statsReady &&
                              prRow?.isVolumePR && (
                              <span className="rounded-full bg-amber-400/90 px-2 py-0.5 text-[11px] font-black text-amber-950 shadow-sm">
                                種目ベスト更新
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                            種目ボリューム{" "}
                            <span className="tabular-nums text-zinc-700 dark:text-zinc-200">
                              {Math.round(exVol).toLocaleString("ja-JP")} kg
                            </span>
                          </p>
                        </div>
                      </div>
                      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {rows.map((rrow, idx) => (
                          <li
                            key={rrow.id}
                            className="flex flex-wrap items-center justify-between gap-2 bg-white/50 px-4 py-3 dark:bg-zinc-950/40"
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                                {idx + 1}
                              </span>
                              <span className="font-mono text-sm tabular-nums text-zinc-800 dark:text-zinc-200">
                                {rrow.weightKg} kg × {rrow.reps} 回
                              </span>
                            </div>
                            <button
                              type="button"
                              className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
                              onClick={() => void removeSet(rrow.id)}
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
            </div>
          )}
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="mx-auto max-w-lg pb-[env(safe-area-inset-bottom,0px)]">
          <button
            type="button"
            onClick={() => router.push("/history")}
            className="w-full rounded-2xl bg-zinc-900 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            記録を完了して一覧へ
          </button>
        </div>
      </div>
    </>
  );
}
