"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSetting, setSetting } from "@/lib/db";

export default function SettingsPage() {
  const [goal, setGoal] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void getSetting("goal").then((v) => {
      if (v) setGoal(v);
    });
  }, []);

  async function save() {
    await setSetting("goal", goal);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <Link
        href="/"
        className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
      >
        ← ホーム
      </Link>
      <h1 className="mt-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        目標メモ
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        「LLM に今日のメニューを提案してもらう」を使うとき、この内容が参考として送信されます（トレ記録本体は端末のみに保存）。
      </p>

      <textarea
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        rows={6}
        placeholder="例：ベンチ80kgを安定させたい、肩は無理しない…"
        className="mt-6 w-full rounded-xl border border-zinc-200 bg-white p-4 text-zinc-900 shadow-sm placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
      />

      <button
        type="button"
        onClick={() => void save()}
        className="mt-4 w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-500"
      >
        保存
      </button>

      {saved && (
        <p className="mt-3 text-center text-sm text-emerald-600 dark:text-emerald-400">
          保存しました
        </p>
      )}
    </div>
  );
}
