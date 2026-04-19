"use client";

import { useCallback, useState } from "react";
import {
  exportTrainingHistoryForLlmJson,
  type LlmHistoryRange,
} from "@/lib/llmHistoryExport";

function downloadJsonFile(json: string, filename: string): void {
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatDateStamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function LlmHistoryExportSection() {
  const [busy, setBusy] = useState<LlmHistoryRange | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const onExport = useCallback(async (mode: LlmHistoryRange) => {
    setBusy(mode);
    setMessage(null);
    try {
      const { json, sessionCount } = await exportTrainingHistoryForLlmJson(mode);
      const stamp = formatDateStamp(new Date());
      const suffix = mode === "all" ? "all" : "last30days";
      downloadJsonFile(json, `muscrecord-llm-history-${suffix}-${stamp}.json`);
      setMessage(
        `${mode === "all" ? "全期間" : "直近30日"}の記録をエクスポートしました（${sessionCount} セッション）。`,
      );
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "LLM向けエクスポートに失敗しました。",
      );
    } finally {
      setBusy(null);
    }
  }, []);

  return (
    <section className="mt-10 rounded-2xl border border-zinc-200/80 bg-white/80 p-5 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
        LLM向けエクスポート
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
        ChatGPT などに貼りやすい JSON 形式で、過去の記録を出力します。
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void onExport("all")}
          className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-violet-500/30 transition hover:bg-violet-500 disabled:opacity-50 dark:bg-violet-500/90 dark:hover:bg-violet-400"
        >
          全期間をエクスポート
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void onExport("last30days")}
          className="rounded-xl border border-zinc-300/80 bg-white/80 px-4 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-white/15 dark:bg-zinc-900/60 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          直近30日をエクスポート
        </button>
      </div>
      {message && (
        <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">{message}</p>
      )}
    </section>
  );
}
