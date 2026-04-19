"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import {
  db,
  getOrCreateWorkoutForSessionDate,
  getSetting,
  replaceSetsForWorkout,
} from "@/lib/db";
import type { WorkoutSetRow } from "@/lib/types";
import {
  buildPerExerciseLatestSnapshots,
  buildRecentSessionSummaries,
} from "@/lib/historyForLLM";
import { getExerciseById } from "@/lib/exercises";
import type { SuggestResponse } from "@/lib/suggestionSchema";
import { AppNav } from "@/components/AppNav";
import { todayLocalDateKey } from "@/lib/dateKey";
import {
  BODY_FOCUS_CHIPS,
  defaultTodayContext,
  parseUserProfileJson,
  type BodyPartFocus,
  type TodayContext,
} from "@/lib/userProfile";
import {
  loadTodayContextFromStorage,
  saveTodayContextToStorage,
} from "@/lib/uiPersist";

export function HomeClient() {
  const router = useRouter();
  const [sessionDate, setSessionDate] = useState(todayLocalDateKey);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestResponse | null>(null);
  const [today, setToday] = useState<TodayContext>(defaultTodayContext);
  const [todayReady, setTodayReady] = useState(false);

  useEffect(() => {
    const restored = loadTodayContextFromStorage();
    if (restored) setToday(restored);
    setTodayReady(true);
  }, []);

  useEffect(() => {
    if (!todayReady) return;
    saveTodayContextToStorage(today);
  }, [today, todayReady]);

  const openDayRecord = useCallback(() => {
    router.push(`/day/${sessionDate}`);
  }, [router, sessionDate]);

  const requestSuggestion = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const [summaries, latest, rawProfile] = await Promise.all([
        buildRecentSessionSummaries(8),
        buildPerExerciseLatestSnapshots(),
        getSetting("userProfile"),
      ]);

      const userProfile = parseUserProfileJson(rawProfile);
      const historySummary = JSON.stringify(summaries, null, 2);
      const perExerciseLatest = JSON.stringify(latest, null, 2);

      const res = await fetch("/api/workout/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          historySummary,
          perExerciseLatest,
          userProfile,
          todayContext: today,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(
          typeof data.error === "string" ? data.error : "提案に失敗しました。",
        );
        return;
      }

      setSuggestion(data as SuggestResponse);
      setModalOpen(true);
    } catch {
      setErr("ネットワークまたはサーバーでエラーが発生しました。");
    } finally {
      setBusy(false);
    }
  }, [today]);

  const applySuggestion = useCallback(async () => {
    if (!suggestion) return;
    setBusy(true);
    setErr(null);
    try {
      const workoutId = await getOrCreateWorkoutForSessionDate(sessionDate);
      await db.workouts.update(workoutId, {
        note: `LLM提案: ${suggestion.title ?? ""}`,
      });
      let order = 0;
      const rows: Omit<WorkoutSetRow, "id">[] = [];
      for (const item of suggestion.items) {
        for (const s of item.sets) {
          rows.push({
            workoutId,
            exerciseId: item.exerciseId,
            order: order++,
            weightKg: s.weightKg,
            reps: s.reps,
          });
        }
      }
      await replaceSetsForWorkout(workoutId, rows);
      setModalOpen(false);
      setSuggestion(null);
      router.push(`/day/${sessionDate}`);
    } catch {
      setErr("提案の取り込みに失敗しました。");
    } finally {
      setBusy(false);
    }
  }, [router, sessionDate, suggestion]);

  return (
    <>
      <AppNav current="/" />
      <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-12">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            筋トレ記録
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            日付を選んでからトレーニング記録へ。種目は画像からワンタップ。過去の記録は端末に保存され、メニュー提案はボタンを押したときだけサーバーへ送られます。
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          <strong className="font-semibold">ご注意：</strong>
          LLM による提案は参考です。体調・痛みがあるときは無理せず、必要なら専門家に相談してください。
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <label
            htmlFor="session-date"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            トレーニング日を選ぶ
          </label>
          <input
            id="session-date"
            type="date"
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
            className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-base text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
          />
        </div>

        <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            今日のメニュー提案用（送信はボタンを押したときのみ）
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            身長・体重は{" "}
            <Link
              href="/settings"
              className="text-blue-600 underline dark:text-blue-400"
            >
              設定
            </Link>
            へ。
          </p>

          <p className="mt-4 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            今日鍛えたい部位（タップで複数選択・空ならおまかせ）
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {BODY_FOCUS_CHIPS.map(({ id, label }) => {
              const on = today.focusBodyParts.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() =>
                    setToday((prev) => ({
                      ...prev,
                      focusBodyParts: on
                        ? prev.focusBodyParts.filter((c) => c !== id)
                        : [...prev.focusBodyParts, id as BodyPartFocus],
                    }))
                  }
                  className={clsx(
                    "min-h-[48px] rounded-xl border-2 px-2 py-3 text-sm font-semibold transition active:scale-[0.98]",
                    on
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <label className="mt-5 block text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">疲労 (1〜5)</span>
            <select
              value={today.fatigueLevel}
              onChange={(e) =>
                setToday({
                  ...today,
                  fatigueLevel:
                    e.target.value === ""
                      ? ""
                      : (Number(e.target.value) as TodayContext["fatigueLevel"]),
                })
              }
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
            >
              <option value="">未入力</option>
              <option value={1}>1 軽い</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
              <option value={5}>5 強い</option>
            </select>
          </label>
          <label className="mt-3 block text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">
              モチベーション
            </span>
            <select
              value={today.motivation}
              onChange={(e) =>
                setToday({
                  ...today,
                  motivation: e.target.value as TodayContext["motivation"],
                })
              }
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
            >
              <option value="">未入力</option>
              <option value="low">低め</option>
              <option value="normal">ふつう</option>
              <option value="high">高め</option>
            </select>
          </label>
        </section>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={openDayRecord}
            className="rounded-2xl bg-blue-600 px-6 py-4 text-center text-lg font-semibold text-white shadow-lg hover:bg-blue-500 disabled:opacity-50"
          >
            トレーニング記録
          </button>

          <Link
            href="/history"
            className="rounded-2xl border border-zinc-200 bg-white px-6 py-3 text-center text-sm font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            種目別の記録
          </Link>

          <button
            type="button"
            disabled={busy}
            onClick={() => void requestSuggestion()}
            className="rounded-2xl border-2 border-blue-600 bg-white px-6 py-4 text-center text-lg font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50 dark:bg-zinc-900 dark:text-blue-300 dark:hover:bg-zinc-800"
          >
            メニュー提案（記録・設定を反映）
          </button>

          <Link
            href="/settings"
            className="rounded-2xl px-6 py-3 text-center text-sm font-medium text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
          >
            からだの情報（身長・体重など）
          </Link>
        </div>

        {err && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">
            {err}
          </p>
        )}
      </div>

      {modalOpen && suggestion && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900"
          >
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              {suggestion.title ?? "今日の提案"}
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              {suggestion.summary}
            </p>

            {suggestion.assumptionsMade && (
              <p className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400">
                <strong className="font-medium">置いた仮定：</strong>
                {suggestion.assumptionsMade}
              </p>
            )}

            {suggestion.todayFocus && (
              <p className="mt-4 text-sm font-medium text-blue-800 dark:text-blue-200">
                今日の狙い：{suggestion.todayFocus}
              </p>
            )}
            {suggestion.progressionHint && (
              <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                重量・進捗の目安：{suggestion.progressionHint}
              </p>
            )}

            <ul className="mt-6 space-y-4 border-t border-zinc-200 pt-4 dark:border-zinc-700">
              {suggestion.items.map((item) => (
                <li key={item.exerciseId} className="text-sm">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {getExerciseById(item.exerciseId)?.name ?? item.exerciseId}
                  </span>
                  <div className="mt-1 text-zinc-600 dark:text-zinc-400">
                    {item.repRange && (
                      <span className="mr-2">回数レンジ: {item.repRange}</span>
                    )}
                    {item.targetRir && (
                      <span className="mr-2">RIR: {item.targetRir}</span>
                    )}
                    {item.restBetweenSets && (
                      <span>休憩: {item.restBetweenSets}</span>
                    )}
                  </div>
                  {item.weightPolicy && (
                    <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                      重量方針: {item.weightPolicy}
                    </p>
                  )}
                  <p className="mt-1 text-zinc-700 dark:text-zinc-300">
                    セット（取り込み）：{" "}
                    {item.sets
                      .map((s) => `${s.weightKg}kg×${s.reps}`)
                      .join(" / ")}
                  </p>
                  {item.note && (
                    <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                      {item.note}
                    </p>
                  )}
                </li>
              ))}
            </ul>

            <p className="mt-4 text-xs text-amber-800 dark:text-amber-200">
              取り込むと、選択中の日付の記録がこの内容に置き換わります（既存セットは消えます）。
            </p>

            <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="rounded-xl px-4 py-3 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                onClick={() => {
                  setModalOpen(false);
                  setSuggestion(null);
                }}
              >
                キャンセル
              </button>
              <button
                type="button"
                disabled={busy}
                className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                onClick={() => void applySuggestion()}
              >
                この内容で日付に取り込む
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
