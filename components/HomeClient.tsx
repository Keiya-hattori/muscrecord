"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppNav } from "@/components/AppNav";
import { todayLocalDateKey } from "@/lib/dateKey";

export function HomeClient() {
  const router = useRouter();
  const [sessionDate, setSessionDate] = useState(todayLocalDateKey);

  return (
    <>
      <AppNav current="/" />
      <div className="mx-auto flex max-w-lg flex-col gap-8 px-4 py-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            筋トレ記録
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            日付を決めて記録を開始するか、メニュー提案ページで条件を整えてから生成できます。データは基本は端末のみに保存されます。
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <label
            htmlFor="session-date"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            トレーニング日
          </label>
          <input
            id="session-date"
            type="date"
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
            className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-base text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
          />
        </div>

        <button
          type="button"
          onClick={() => router.push(`/day/${sessionDate}`)}
          className="rounded-2xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-lg transition hover:bg-blue-500 active:scale-[0.99]"
        >
          この日の記録を開く
        </button>

        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 p-5 dark:border-zinc-700 dark:bg-zinc-900/40">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            ほかの操作
          </p>
          <ul className="mt-3 space-y-3 text-sm">
            <li>
              <Link
                href="/suggest"
                className="font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
              >
                メニュー提案（LLM）
              </Link>
              <span className="ml-2 text-zinc-500 dark:text-zinc-400">
                — 記録をもとにメニュー生成
              </span>
            </li>
            <li>
              <Link
                href="/history"
                className="font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
              >
                種目別の記録
              </Link>
            </li>
            <li>
              <Link
                href="/progress"
                className="font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
              >
                グラフ・称号
              </Link>
            </li>
            <li>
              <Link
                href="/settings"
                className="font-medium text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-300"
              >
                からだの情報（設定）
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
