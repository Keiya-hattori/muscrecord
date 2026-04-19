"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import {
  db,
  getOrCreateWorkoutForSessionDate,
  getSetting,
  setWorkoutPendingLlmMenu,
} from "@/lib/db";
import {
  buildPerExerciseLatestSnapshots,
  buildRecentSessionSummaries,
} from "@/lib/historyForLLM";
import { getExerciseById } from "@/lib/exercises";
import type { SuggestResponse } from "@/lib/suggestionSchema";
import { buildPendingMenuFromSuggestion } from "@/lib/pendingLlmMenu";
import { generateWorkoutSuggestion } from "@/lib/workoutSuggestGemini";
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

export function SuggestClient() {
  const router = useRouter();
  const [sessionDate, setSessionDate] = useState(() => todayLocalDateKey());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestResponse | null>(null);
  const [today, setToday] = useState<TodayContext>(defaultTodayContext);
  const [todayReady, setTodayReady] = useState(false);

  useEffect(() => {
    setSessionDate(todayLocalDateKey());
  }, []);

  useEffect(() => {
    const restored = loadTodayContextFromStorage();
    if (restored) setToday(restored);
    setTodayReady(true);
  }, []);

  useEffect(() => {
    if (!todayReady) return;
    saveTodayContextToStorage(today);
  }, [today, todayReady]);

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

      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY?.trim();
      if (!apiKey) {
        setErr(
          "メニュー提案には Google AI の API キーが必要です。環境変数 NEXT_PUBLIC_GEMINI_API_KEY を設定してください（.env.local またはホスティングの環境変数）。",
        );
        return;
      }

      const model =
        process.env.NEXT_PUBLIC_WORKOUT_LLM_MODEL ?? "gemini-2.5-flash";

      const data = await generateWorkoutSuggestion(
        apiKey,
        {
          historySummary,
          perExerciseLatest,
          userProfile,
          todayContext: today,
        },
        model,
      );
      setSuggestion(data);
      setModalOpen(true);
    } catch (e) {
      setErr(
        e instanceof Error ? e.message : "提案の取得に失敗しました。",
      );
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
      const payload = buildPendingMenuFromSuggestion(suggestion);
      await db.workouts.update(workoutId, {
        note: suggestion.title?.trim()
          ? `LLM提案: ${suggestion.title}`
          : "LLM提案",
      });
      await setWorkoutPendingLlmMenu(workoutId, payload);
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
      <AppNav current="/suggest" />
      <div className="mx-auto flex min-w-0 max-w-lg flex-col gap-6 overflow-x-hidden px-4 py-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            メニュー提案
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            直近の記録と設定をサーバーに送り、今日のメニューを生成します（送信は「提案する」押下時のみ）。
          </p>
        </div>

        <p className="text-xs text-amber-900 dark:text-amber-100/90">
          LLM の提案は参考です。体調・痛みがあるときは無理せず、必要なら専門家に相談してください。
        </p>

        <div className="min-w-0 max-w-full rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <label
            htmlFor="suggest-session-date"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            取り込む日付
          </label>
          <input
            id="suggest-session-date"
            type="date"
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
            className="mt-2 box-border w-full min-w-0 max-w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-base text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 sm:px-4"
          />
        </div>

        <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            今日のコンディション
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            身長・体重は{" "}
            <Link
              href="/settings"
              className="text-blue-600 underline dark:text-blue-400"
            >
              設定
            </Link>
          </p>

          <p className="mt-4 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            鍛えたい部位（複数可・空ならおまかせ）
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

        <button
          type="button"
          disabled={busy}
          onClick={() => void requestSuggestion()}
          className="rounded-2xl bg-blue-600 px-6 py-4 text-center text-lg font-semibold text-white shadow-lg hover:bg-blue-500 disabled:opacity-50"
        >
          {busy ? "生成中…" : "メニューを提案する"}
        </button>

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
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              過去の記録から見た今日の狙い
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              {suggestion.summary}
            </p>

            {suggestion.assumptionsMade && (
              <p className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400">
                <strong className="font-medium">置いた仮定：</strong>
                {suggestion.assumptionsMade}
              </p>
            )}

            {suggestion.todayFocus?.trim() && (
              <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
                {suggestion.todayFocus}
              </p>
            )}
            {suggestion.progressionHint?.trim() && (
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                重量の目安：{suggestion.progressionHint}
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
                  <p className="mt-1 font-mono text-sm tabular-nums text-zinc-800 dark:text-zinc-200">
                    {item.sets
                      .map((s) => `${s.weightKg} kg × ${s.reps} 回`)
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
              取り込むと、その日の記録画面に提案セットが並びます。チェックしたセットだけ実際の記録に追加され、既存の記録は消えません。
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
                この内容を記録画面に取り込む
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
