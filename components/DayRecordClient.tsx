"use client";

import Link from "next/link";
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
  getSetting,
  getWorkoutIdForSessionDate,
  markPendingLlmRowApplied,
  nextOrderForWorkout,
  removeSet,
  setWorkoutPendingLlmMenu,
  updateSet,
  updateWorkoutTrainingContext,
} from "@/lib/db";
import { AppNav } from "@/components/AppNav";
import { ExerciseCover } from "@/components/ExerciseCover";
import { useRecordableExercises } from "@/hooks/useRecordableExercises";
import { getExerciseById } from "@/lib/exercises";
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
  exercisesForRecordTab,
  getWeightSelectOptionsForExercise,
  recordTabForExercise,
  snapWeightToStepKg,
  type RecordBodyTabId,
} from "@/lib/recordBodyTabs";
import {
  countDistinctExercises,
  countMainSets,
  maxOtherExerciseVolumeKg,
  maxOtherWorkoutVolumeKg,
  totalVolumeKg,
  volumeByExerciseInSets,
} from "@/lib/dayRecordAchievements";
import {
  INCLINE_BENCH_PRESS_ID,
  isUnilateralDumbbellExercise,
  normalizeSetKind,
} from "@/lib/setVolume";
import { parseUserProfileJson } from "@/lib/userProfile";
import type { SetKind, TrainingContext, WorkoutSetRow } from "@/lib/types";

type Props = {
  dateKey: string;
};

type DraftRow = {
  id: string;
  weightKg: number;
  reps: number;
  setKind: SetKind;
  rir: number | null;
  weightLeftKg: number | null;
  weightRightKg: number | null;
};

type DraftPanel = {
  exerciseId: string;
  draftSets: DraftRow[];
};

function newDraftRow(
  override?: Partial<
    Pick<
      DraftRow,
      | "weightKg"
      | "reps"
      | "setKind"
      | "rir"
      | "weightLeftKg"
      | "weightRightKg"
    >
  > & {
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
    setKind: rest.setKind ?? "main",
    rir: rest.rir ?? null,
    weightLeftKg: rest.weightLeftKg ?? null,
    weightRightKg: rest.weightRightKg ?? null,
  };
}

function toSavedSetBody(
  exerciseId: string,
  row: DraftRow,
): Pick<
  WorkoutSetRow,
  "weightKg" | "reps" | "setKind" | "rir" | "weightLeftKg" | "weightRightKg"
> {
  const w = snapWeightToStepKg(row.weightKg, exerciseId);
  const r = Math.min(50, Math.max(0, Math.floor(row.reps)));
  const base: Pick<
    WorkoutSetRow,
    "weightKg" | "reps" | "setKind" | "rir" | "weightLeftKg" | "weightRightKg"
  > = {
    weightKg: w,
    reps: r,
    setKind: row.setKind,
    rir: row.rir,
  };
  if (isUnilateralDumbbellExercise(exerciseId)) {
    return {
      ...base,
      weightLeftKg:
        row.weightLeftKg != null
          ? snapWeightToStepKg(row.weightLeftKg, exerciseId)
          : null,
      weightRightKg:
        row.weightRightKg != null
          ? snapWeightToStepKg(row.weightRightKg, exerciseId)
          : null,
    };
  }
  return { ...base, weightLeftKg: null, weightRightKg: null };
}

export function DayRecordClient({ dateKey }: Props) {
  const [workoutId, setWorkoutId] = useState<string | null>(null);
  const [trainingContext, setTrainingContext] = useState<TrainingContext | null>(
    null,
  );
  const [bodyTab, setBodyTab] = useState<RecordBodyTabId>("chest");
  const [draftPanels, setDraftPanels] = useState<DraftPanel[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [suggestTodoOpen, setSuggestTodoOpen] = useState(true);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [editWeightKg, setEditWeightKg] = useState(0);
  const [editReps, setEditReps] = useState(0);
  const [editSetKind, setEditSetKind] = useState<SetKind>("main");
  const [editRir, setEditRir] = useState<number | null>(null);
  const [editWeightLeft, setEditWeightLeft] = useState<number | null>(null);
  const [editWeightRight, setEditWeightRight] = useState<number | null>(null);

  const inputSectionRef = useRef<HTMLDivElement>(null);

  const allExercises = useRecordableExercises();
  const exercisesInTab = useMemo(
    () => exercisesForRecordTab(bodyTab, allExercises),
    [bodyTab, allExercises],
  );

  useEffect(() => {
    let cancelled = false;
    void getWorkoutIdForSessionDate(dateKey).then((id) => {
      if (!cancelled) setWorkoutId(id);
    });
    return () => {
      cancelled = true;
    };
  }, [dateKey]);

  const ensureWorkoutId = useCallback(async (): Promise<string> => {
    if (workoutId) return workoutId;
    const id = await getOrCreateWorkoutForSessionDate(dateKey);
    setWorkoutId(id);
    if (trainingContext) {
      await updateWorkoutTrainingContext(id, trainingContext);
    }
    return id;
  }, [workoutId, dateKey, trainingContext]);

  const pickTraining = useCallback(
    (ctx: TrainingContext | null) => {
      setTrainingContext(ctx);
      if (workoutId) {
        void updateWorkoutTrainingContext(workoutId, ctx);
      }
    },
    [workoutId],
  );

  const workoutRow = useLiveQuery(
    () => (workoutId ? db.workouts.get(workoutId) : undefined),
    [workoutId],
  );
  const rawProfile = useLiveQuery(() => getSetting("userProfile"), []);
  const bodyWeightKg = useMemo(
    () => parseUserProfileJson(rawProfile).bodyWeightKg,
    [rawProfile],
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

  useEffect(() => {
    if (workoutRow?.trainingContext) {
      setTrainingContext(workoutRow.trainingContext);
    }
  }, [workoutRow?.trainingContext]);

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
    const vol = totalVolumeKg(list, bodyWeightKg);
    const totalSetCount = list.length;
    const mainSetCount = countMainSets(list);
    const exCount = countDistinctExercises(list);
    const statsReady = Array.isArray(allSetsForStats);
    if (!statsReady) {
      return {
        vol,
        maxHistoricSession: 0,
        isSessionVolumePR: false,
        setCount: mainSetCount,
        totalSetCount,
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
      bodyWeightKg,
    );
    const isSessionVolumePR = vol > maxHistoricSession;
    const byEx = volumeByExerciseInSets(list, bodyWeightKg);
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
        bodyWeightKg,
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
          : mainSetCount >= 8
            ? "メインセットもばっちり。今日も積み上げました。"
            : "一歩ずつが強さになります。今日もえらい！";
    return {
      vol,
      maxHistoricSession,
      isSessionVolumePR,
      setCount: mainSetCount,
      totalSetCount,
      exCount,
      exercisePRs,
      encouragement,
      statsReady: true,
    };
  }, [sets, workoutId, allSetsForStats, bodyWeightKg]);

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
      if (row.applied) return;
      setBusy(true);
      setErr(null);
      try {
        const wid = await ensureWorkoutId();
        const order = await nextOrderForWorkout(wid);
        await addSet({
          workoutId: wid,
          exerciseId: row.exerciseId,
          order,
          weightKg: snapWeightToStepKg(row.weightKg, row.exerciseId),
          reps: Math.min(50, Math.max(0, Math.floor(row.reps))),
          setKind: "main",
        });
        await markPendingLlmRowApplied(wid, row.id);
      } catch {
        setErr("ToDo からの追加に失敗しました。");
      } finally {
        setBusy(false);
      }
    },
    [ensureWorkoutId],
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

  const updateDraftInPanel = useCallback(
    (
      exerciseId: string,
      updater: (rows: DraftRow[]) => DraftRow[],
    ) => {
      setDraftPanels((panels) =>
        panels.map((p) =>
          p.exerciseId === exerciseId
            ? { ...p, draftSets: updater(p.draftSets) }
            : p,
        ),
      );
    },
    [],
  );

  const updateDraft = useCallback(
    (exerciseId: string, rowId: string, patch: Partial<DraftRow>) => {
      updateDraftInPanel(exerciseId, (rows) =>
        rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)),
      );
    },
    [updateDraftInPanel],
  );

  const addDraftRow = useCallback(
    (exerciseId: string) => {
      updateDraftInPanel(exerciseId, (rows) => {
        const last = rows[rows.length - 1];
        return [
          ...rows,
          newDraftRow(
            last
              ? {
                  weightKg: snapWeightToStepKg(last.weightKg, exerciseId),
                  reps: Math.min(50, Math.max(0, Math.floor(last.reps))),
                  setKind: last.setKind,
                  rir: last.rir,
                  weightLeftKg: last.weightLeftKg,
                  weightRightKg: last.weightRightKg,
                  defaultExerciseId: exerciseId,
                }
              : { defaultExerciseId: exerciseId },
          ),
        ];
      });
    },
    [updateDraftInPanel],
  );

  const removeDraftRow = useCallback(
    (exerciseId: string, rowId: string) => {
      updateDraftInPanel(exerciseId, (rows) =>
        rows.length <= 1 ? rows : rows.filter((r) => r.id !== rowId),
      );
    },
    [updateDraftInPanel],
  );

  const openExerciseDraft = useCallback((exerciseId: string) => {
    setDraftPanels((panels) => {
      if (panels.some((p) => p.exerciseId === exerciseId)) return panels;
      return [
        ...panels,
        {
          exerciseId,
          draftSets: [newDraftRow({ defaultExerciseId: exerciseId })],
        },
      ];
    });
    setErr(null);
    requestAnimationFrame(() => {
      inputSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, []);

  const removeDraftPanel = useCallback((exerciseId: string) => {
    setDraftPanels((panels) => panels.filter((p) => p.exerciseId !== exerciseId));
  }, []);

  const confirmAllDraftPanels = useCallback(async () => {
    if (draftPanels.length < 2) return;
    const snapshots = draftPanels.map((p) => ({
      exerciseId: p.exerciseId,
      draftSets: [...p.draftSets],
    }));
    for (const snap of snapshots) {
      if (snap.draftSets.length === 0) {
        setErr("空の種目があります。閉じるかセットを入力してください。");
        return;
      }
      for (const row of snap.draftSets) {
        if (row.weightKg < 0 || row.reps < 0) {
          setErr("重量と回数は0以上にしてください。");
          return;
        }
      }
    }
    setBusy(true);
    setErr(null);
    try {
      const wid = await ensureWorkoutId();
      for (const snap of snapshots) {
        let order = await nextOrderForWorkout(wid);
        for (const row of snap.draftSets) {
          await addSet({
            workoutId: wid,
            exerciseId: snap.exerciseId,
            order: order++,
            ...toSavedSetBody(snap.exerciseId, row),
          });
        }
      }
      setDraftPanels([]);
    } catch {
      setErr("保存に失敗しました。");
    } finally {
      setBusy(false);
    }
  }, [draftPanels, ensureWorkoutId]);

  const confirmDraftPanel = useCallback(
    async (exerciseId: string, draftSets: DraftRow[]) => {
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
        const wid = await ensureWorkoutId();
        let order = await nextOrderForWorkout(wid);
        for (const row of draftSets) {
          await addSet({
            workoutId: wid,
            exerciseId,
            order: order++,
            ...toSavedSetBody(exerciseId, row),
          });
        }
        setDraftPanels((panels) => panels.filter((p) => p.exerciseId !== exerciseId));
      } catch {
        setErr("保存に失敗しました。");
      } finally {
        setBusy(false);
      }
    },
    [ensureWorkoutId],
  );

  const startEditSet = useCallback((row: WorkoutSetRow) => {
    setEditingSetId(row.id);
    setEditingExerciseId(row.exerciseId);
    setEditWeightKg(snapWeightToStepKg(row.weightKg, row.exerciseId));
    setEditReps(Math.min(50, Math.max(0, Math.floor(row.reps))));
    setEditSetKind(normalizeSetKind(row.setKind));
    setEditRir(row.rir ?? null);
    setEditWeightLeft(
      row.weightLeftKg != null
        ? snapWeightToStepKg(row.weightLeftKg, row.exerciseId)
        : null,
    );
    setEditWeightRight(
      row.weightRightKg != null
        ? snapWeightToStepKg(row.weightRightKg, row.exerciseId)
        : null,
    );
  }, []);

  const cancelEditSet = useCallback(() => {
    setEditingSetId(null);
    setEditingExerciseId(null);
  }, []);

  const saveEditSet = useCallback(async () => {
    if (!editingSetId || !editingExerciseId) return;
    setBusy(true);
    setErr(null);
    try {
      const exId = editingExerciseId;
      const patch: Parameters<typeof updateSet>[1] = {
        weightKg: snapWeightToStepKg(editWeightKg, exId),
        reps: Math.min(50, Math.max(0, Math.floor(editReps))),
        setKind: editSetKind,
        rir: editRir,
      };
      if (isUnilateralDumbbellExercise(exId)) {
        patch.weightLeftKg =
          editWeightLeft != null ? snapWeightToStepKg(editWeightLeft, exId) : null;
        patch.weightRightKg =
          editWeightRight != null ? snapWeightToStepKg(editWeightRight, exId) : null;
      } else {
        patch.weightLeftKg = null;
        patch.weightRightKg = null;
      }
      await updateSet(editingSetId, patch);
      setEditingSetId(null);
      setEditingExerciseId(null);
    } catch {
      setErr("更新に失敗しました。");
    } finally {
      setBusy(false);
    }
  }, [
    editingSetId,
    editingExerciseId,
    editWeightKg,
    editReps,
    editSetKind,
    editRir,
    editWeightLeft,
    editWeightRight,
  ]);

  const selectWheelClass =
    "h-14 w-full appearance-none rounded-xl border border-zinc-200 bg-white px-3 text-center text-base font-semibold tabular-nums shadow-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50";

  return (
    <>
      <AppNav />

      <div className="mx-auto max-w-4xl px-4 pb-12 pt-4">
        <header className="border-b border-zinc-200 pb-4 dark:border-zinc-700">
          <Link
            href="/"
            className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            ← ホーム
          </Link>
        </header>

        <section className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-900/50">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            今日のトレ（任意）
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => pickTraining("solo")}
              className={clsx(
                "rounded-xl px-3 py-1.5 text-sm font-medium transition",
                trainingContext === "solo"
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-zinc-700 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-600",
              )}
            >
              ソロ
            </button>
            <button
              type="button"
              onClick={() => pickTraining("partner")}
              className={clsx(
                "rounded-xl px-3 py-1.5 text-sm font-medium transition",
                trainingContext === "partner"
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-zinc-700 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-600",
              )}
            >
              合同
            </button>
            <button
              type="button"
              onClick={() => pickTraining(null)}
              className="rounded-xl px-3 py-1.5 text-sm text-zinc-500 ring-1 ring-zinc-200 dark:text-zinc-400 dark:ring-zinc-600"
            >
              未設定
            </button>
          </div>
        </section>

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
                  提案メニュー
                </p>
                <p className="mt-0.5 text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  {pendingMenu.title ?? "今日のメニュー"}
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
                                    {snapWeightToStepKg(row.weightKg, row.exerciseId)}{" "}
                                    kg ×{" "}
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
                  onClick={() => openExerciseDraft(ex.id)}
                  className={clsx(
                    "flex w-[76px] shrink-0 flex-col items-center gap-1 rounded-xl p-2 transition active:scale-[0.97]",
                    draftPanels.some((p) => p.exerciseId === ex.id)
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

          <div className="flex flex-col gap-6">
            {draftPanels.map((panel) => {
              const selectedExercise = getExerciseById(panel.exerciseId);
              const { draftSets } = panel;
              const exId = panel.exerciseId;
              return (
                <div
                  key={exId}
                  id={`draft-panel-${exId}`}
                  className="rounded-2xl border border-blue-200 bg-white p-4 dark:border-blue-900/40 dark:bg-zinc-900"
                >
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                    <p className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                      {selectedExercise?.name ?? panel.exerciseId}
                    </p>
                    <button
                      type="button"
                      aria-label="この種目の入力を閉じる"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-lg font-light text-zinc-500 hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
                      onClick={() => removeDraftPanel(exId)}
                    >
                      ✕
                    </button>
                  </div>

                  <div className="flex flex-col gap-5">
                    {draftSets.map((row, index) => {
                      const wVal = snapWeightToStepKg(row.weightKg, exId);
                      const weightOptions = getWeightSelectOptionsForExercise(exId);
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
                                onClick={() => removeDraftRow(exId, row.id)}
                              >
                                削除
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label
                                className="mb-1 block text-center text-xs font-medium text-zinc-500"
                                htmlFor={`w-${exId}-${row.id}`}
                              >
                                重量 (kg)
                              </label>
                              <select
                                id={`w-${exId}-${row.id}`}
                                className={selectWheelClass}
                                value={wVal}
                                onChange={(e) =>
                                  updateDraft(exId, row.id, {
                                    weightKg: Number(e.target.value),
                                  })
                                }
                              >
                                {weightOptions.map((w) => (
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
                                htmlFor={`r-${exId}-${row.id}`}
                              >
                                回数
                              </label>
                              <select
                                id={`r-${exId}-${row.id}`}
                                className={selectWheelClass}
                                value={rVal}
                                onChange={(e) =>
                                  updateDraft(exId, row.id, {
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
                          {exId === INCLINE_BENCH_PRESS_ID && (
                            <p className="mt-2 text-center text-[10px] text-amber-800/90 dark:text-amber-200/90">
                              1サイド分の重さ。ボリュームは左右合算で計算します。
                            </p>
                          )}
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-medium text-zinc-500">
                              種別
                            </span>
                            {(
                              [
                                { k: "main" as const, label: "メイン" },
                                { k: "warmup" as const, label: "W" },
                                { k: "dropset" as const, label: "D" },
                              ] as const
                            ).map(({ k, label }) => (
                              <button
                                key={k}
                                type="button"
                                onClick={() => updateDraft(exId, row.id, { setKind: k })}
                                className={clsx(
                                  "rounded-lg px-2.5 py-1 text-xs font-semibold",
                                  row.setKind === k
                                    ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900"
                                    : "bg-zinc-200/80 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300",
                                )}
                              >
                                {label}
                              </button>
                            ))}
                            <label className="ml-1 flex items-center gap-1 text-xs text-zinc-500">
                              RIR
                              <select
                                value={row.rir == null ? "" : String(row.rir)}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  updateDraft(exId, row.id, {
                                    rir: v === "" ? null : Number(v),
                                  });
                                }}
                                className="rounded border border-zinc-200 bg-white px-1 py-0.5 text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                              >
                                <option value="">—</option>
                                {Array.from({ length: 11 }, (_, i) => i).map((r) => (
                                  <option key={r} value={r}>
                                    {r}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                          {isUnilateralDumbbellExercise(exId) && (
                            <div className="mt-2 grid grid-cols-2 gap-3">
                              <div>
                                <label className="mb-1 block text-center text-xs text-zinc-500">
                                  左 (kg)
                                </label>
                                <select
                                  className={selectWheelClass}
                                  value={
                                    row.weightLeftKg != null
                                      ? snapWeightToStepKg(
                                          row.weightLeftKg,
                                          exId,
                                        )
                                    : wVal
                                  }
                                  onChange={(e) =>
                                    updateDraft(exId, row.id, {
                                      weightLeftKg: Number(e.target.value),
                                    })
                                  }
                                >
                                  {weightOptions.map((w) => (
                                    <option key={w} value={w}>
                                      {w % 1 === 0 ? w : w.toFixed(1)} kg
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="mb-1 block text-center text-xs text-zinc-500">
                                  右 (kg)
                                </label>
                                <select
                                  className={selectWheelClass}
                                  value={
                                    row.weightRightKg != null
                                      ? snapWeightToStepKg(
                                          row.weightRightKg,
                                          exId,
                                        )
                                    : wVal
                                  }
                                  onChange={(e) =>
                                    updateDraft(exId, row.id, {
                                      weightRightKg: Number(e.target.value),
                                    })
                                  }
                                >
                                  {weightOptions.map((w) => (
                                    <option key={w} value={w}>
                                      {w % 1 === 0 ? w : w.toFixed(1)} kg
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => addDraftRow(exId)}
                    className="mt-4 w-full rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                  >
                    ＋ セットを追加
                  </button>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void confirmDraftPanel(exId, draftSets)}
                    className="mt-4 w-full rounded-2xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white shadow hover:bg-blue-500 disabled:opacity-50"
                  >
                    この種目のセットをまとめて確定
                  </button>
                </div>
              );
            })}
          </div>

          {draftPanels.length === 0 && (
            <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-600 dark:text-zinc-400">
              上から部位 → 種目をタップすると、ここに入力欄が並びます。別の種目をタップすると下に追加されます。
            </p>
          )}

          {err && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">
              {err}
            </p>
          )}

          {draftPanels.length >= 2 && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void confirmAllDraftPanels()}
              className="mt-6 w-full rounded-2xl border-2 border-blue-600 bg-white py-4 text-lg font-semibold text-blue-600 shadow-sm transition hover:bg-blue-50 disabled:opacity-50 dark:border-blue-500 dark:bg-zinc-900 dark:text-blue-400 dark:hover:bg-blue-950/40"
            >
              すべての種目のセットをまとめて確定
            </button>
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
                        メインセット {sessionHighlights.setCount}
                        {sessionHighlights.totalSetCount !==
                          sessionHighlights.setCount && (
                          <span className="ml-1 text-white/80">
                            （全 {sessionHighlights.totalSetCount}）
                          </span>
                        )}
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
                            className="flex flex-col gap-3 bg-white/50 px-4 py-3 dark:bg-zinc-950/40"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex min-w-0 flex-1 items-center gap-3">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                                  {idx + 1}
                                </span>
                                {editingSetId === rrow.id ? (
                                  <div className="flex w-full min-w-0 max-w-md flex-col gap-2">
                                    <div className="grid grid-cols-2 gap-2">
                                      <select
                                        className={selectWheelClass}
                                        value={snapWeightToStepKg(
                                          editWeightKg,
                                          exId,
                                        )}
                                        onChange={(e) =>
                                          setEditWeightKg(Number(e.target.value))
                                        }
                                      >
                                        {getWeightSelectOptionsForExercise(
                                          exId,
                                        ).map((w) => (
                                          <option key={w} value={w}>
                                            {w % 1 === 0 ? w : w.toFixed(1)} kg
                                          </option>
                                        ))}
                                      </select>
                                      <select
                                        className={selectWheelClass}
                                        value={Math.min(
                                          50,
                                          Math.max(0, Math.floor(editReps)),
                                        )}
                                        onChange={(e) =>
                                          setEditReps(Number(e.target.value))
                                        }
                                      >
                                        {REP_SELECT_OPTIONS.map((r) => (
                                          <option key={r} value={r}>
                                            {r} 回
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      {(
                                        [
                                          { k: "main" as const, label: "メイン" },
                                          { k: "warmup" as const, label: "W" },
                                          { k: "dropset" as const, label: "D" },
                                        ] as const
                                      ).map(({ k, label }) => (
                                        <button
                                          key={k}
                                          type="button"
                                          onClick={() => setEditSetKind(k)}
                                          className={clsx(
                                            "rounded-lg px-2 py-0.5 text-xs font-semibold",
                                            editSetKind === k
                                              ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900"
                                              : "bg-zinc-200/80 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300",
                                          )}
                                        >
                                          {label}
                                        </button>
                                      ))}
                                      <label className="flex items-center gap-1 text-xs text-zinc-500">
                                        RIR
                                        <select
                                          value={editRir == null ? "" : String(editRir)}
                                          onChange={(e) => {
                                            const v = e.target.value;
                                            setEditRir(
                                              v === "" ? null : Number(v),
                                            );
                                          }}
                                          className="rounded border border-zinc-200 bg-white px-1 text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800"
                                        >
                                          <option value="">—</option>
                                          {Array.from(
                                            { length: 11 },
                                            (_, i) => i,
                                          ).map((r) => (
                                            <option key={r} value={r}>
                                              {r}
                                            </option>
                                          ))}
                                        </select>
                                      </label>
                                    </div>
                                    {isUnilateralDumbbellExercise(exId) && (
                                      <div className="grid grid-cols-2 gap-2">
                                        <select
                                          className={selectWheelClass}
                                          value={snapWeightToStepKg(
                                            editWeightLeft ?? editWeightKg,
                                            exId,
                                          )}
                                          onChange={(e) =>
                                            setEditWeightLeft(Number(e.target.value))
                                          }
                                        >
                                          {getWeightSelectOptionsForExercise(
                                            exId,
                                          ).map((w) => (
                                            <option key={w} value={w}>
                                              左 {w % 1 === 0 ? w : w.toFixed(1)} kg
                                            </option>
                                          ))}
                                        </select>
                                        <select
                                          className={selectWheelClass}
                                          value={snapWeightToStepKg(
                                            editWeightRight ?? editWeightKg,
                                            exId,
                                          )}
                                          onChange={(e) =>
                                            setEditWeightRight(Number(e.target.value))
                                          }
                                        >
                                          {getWeightSelectOptionsForExercise(
                                            exId,
                                          ).map((w) => (
                                            <option key={w} value={w}>
                                              右 {w % 1 === 0 ? w : w.toFixed(1)} kg
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="flex flex-wrap items-center gap-2 font-mono text-sm tabular-nums text-zinc-800 dark:text-zinc-200">
                                    {normalizeSetKind(rrow.setKind) !==
                                      "main" && (
                                      <span className="rounded bg-amber-100 px-1 text-[10px] text-amber-900 dark:bg-amber-900/50 dark:text-amber-100">
                                        {normalizeSetKind(rrow.setKind) ===
                                        "warmup"
                                          ? "W"
                                          : "D"}
                                      </span>
                                    )}
                                    {isUnilateralDumbbellExercise(exId) &&
                                    (rrow.weightLeftKg != null ||
                                      rrow.weightRightKg != null) ? (
                                      <>
                                        L {rrow.weightLeftKg ?? "—"} / R{" "}
                                        {rrow.weightRightKg ?? "—"} ×{" "}
                                        {rrow.reps} 回
                                      </>
                                    ) : (
                                      <>
                                        {rrow.weightKg} kg × {rrow.reps} 回
                                        {exId === INCLINE_BENCH_PRESS_ID && (
                                          <span className="text-[10px] text-zinc-500">
                                            （1サイド表記・換算2倍）
                                          </span>
                                        )}
                                      </>
                                    )}
                                    {rrow.rir != null && (
                                      <span className="text-xs text-zinc-500">
                                        RIR{rrow.rir}
                                      </span>
                                    )}
                                  </span>
                                )}
                              </div>
                              <div className="flex shrink-0 flex-wrap items-center gap-1">
                                {editingSetId === rrow.id ? (
                                  <>
                                    <button
                                      type="button"
                                      disabled={busy}
                                      className="rounded-lg px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                      onClick={cancelEditSet}
                                    >
                                      キャンセル
                                    </button>
                                    <button
                                      type="button"
                                      disabled={busy}
                                      className="rounded-lg bg-blue-600 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                                      onClick={() => void saveEditSet()}
                                    >
                                      保存
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      className="rounded-lg px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
                                      onClick={() => startEditSet(rrow)}
                                    >
                                      編集
                                    </button>
                                    <button
                                      type="button"
                                      className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
                                      onClick={() => void removeSet(rrow.id)}
                                    >
                                      削除
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
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

    </>
  );
}
