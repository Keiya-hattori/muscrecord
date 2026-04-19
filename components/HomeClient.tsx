"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import {
  createWorkout,
  getSetting,
  replaceSetsForWorkout,
} from "@/lib/db";
import type { WorkoutSetRow } from "@/lib/types";
import { buildRecentSessionSummaries } from "@/lib/historyForLLM";
import { getExerciseById } from "@/lib/exercises";
import type { SuggestResponse } from "@/lib/suggestionSchema";

export function HomeClient() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestResponse | null>(null);

  const startBlank = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const id = await createWorkout();
      router.push(`/workout/${id}`);
    } catch {
      setErr("セッションを開始できませんでした。");
    } finally {
      setBusy(false);
    }
  }, [router]);

  const requestSuggestion = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const summaries = await buildRecentSessionSummaries(6);
      const goal = await getSetting("goal");
      const historySummary = JSON.stringify(summaries, null, 2);

      const res = await fetch("/api/workout/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          historySummary,
          userGoal: goal ?? undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(typeof data.error === "string" ? data.error : "提案に失敗しました。");
        return;
      }

      setSuggestion(data as SuggestResponse);
      setModalOpen(true);
    } catch {
      setErr("ネットワークまたはサーバーでエラーが発生しました。");
    } finally {
      setBusy(false);
    }
  }, []);

  const applySuggestion = useCallback(async () => {
    if (!suggestion) return;
    setBusy(true);
    setErr(null);
    try {
      const workoutId = await createWorkout(`LLM提案: ${suggestion.title ?? ""}`);
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
      router.push(`/workout/${workoutId}`);
    } catch {
      setErr("提案の取り込みに失敗しました。");
    } finally {
      setBusy(false);
    }
  }, [router, suggestion]);

  return (
    <>
      <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-12">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            筋トレ記録
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            種目は画像からワンタップ。過去の記録は端末に保存され、今日のメニュー提案は「トレ開始」時だけサーバーへ送られます。
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          <strong className="font-semibold">ご注意：</strong>
          LLM による提案は参考です。体調・痛みがあるときは無理せず、必要なら専門家に相談してください。
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void startBlank()}
            className="rounded-2xl bg-blue-600 px-6 py-4 text-center text-lg font-semibold text-white shadow-lg hover:bg-blue-500 disabled:opacity-50"
          >
            空のセッションでトレ開始
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => void requestSuggestion()}
            className="rounded-2xl border-2 border-blue-600 bg-white px-6 py-4 text-center text-lg font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50 dark:bg-zinc-900 dark:text-blue-300 dark:hover:bg-zinc-800"
          >
            LLM に今日のメニューを提案してもらう
          </button>

          <Link
            href="/settings"
            className="rounded-2xl px-6 py-3 text-center text-sm font-medium text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
          >
            目標メモ（提案時に送信）
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
            <ul className="mt-6 space-y-4 border-t border-zinc-200 pt-4 dark:border-zinc-700">
              {suggestion.items.map((item) => (
                <li key={item.exerciseId} className="text-sm">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {getExerciseById(item.exerciseId)?.name ?? item.exerciseId}
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {" "}
                    — {item.sets.map((s) => `${s.weightKg}kg×${s.reps}`).join(" / ")}
                  </span>
                  {item.note && (
                    <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                      {item.note}
                    </p>
                  )}
                </li>
              ))}
            </ul>

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
                この内容で開始
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
