"use client";

import { useState } from "react";
import { seedTwoWeekSampleWorkouts } from "@/lib/seedTestData";

export function SeedTestDataSection() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSeed() {
    if (
      !window.confirm(
        "過去約2週間ぶんのサンプルワークアウト（10種目・計10セッション）を追加します。よろしいですか？",
      )
    ) {
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const { workoutCount, setCount } = await seedTwoWeekSampleWorkouts();
      setMessage(
        `追加しました（ワークアウト ${workoutCount} 件・セット合計 ${setCount}）。履歴・グラフで確認できます。`,
      );
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "追加に失敗しました。もう一度お試しください。",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-10 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        デモ用データ
      </h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        ベンチプレス〜インクラインアームカールまで指定の10種目で、過去約2週間ぶんのダミー記録をまとめて追加します。既存の記録は消さずに追記されます。
      </p>
      <button
        type="button"
        onClick={onSeed}
        disabled={busy}
        className="mt-4 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition enabled:hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:enabled:hover:bg-white"
      >
        {busy ? "追加中…" : "サンプルデータを追加"}
      </button>
      {message ? (
        <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">{message}</p>
      ) : null}
    </section>
  );
}
