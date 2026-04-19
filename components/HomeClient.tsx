"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { todayLocalDateKey } from "@/lib/dateKey";

export function HomeClient() {
  const router = useRouter();
  const [sessionDate, setSessionDate] = useState(() => todayLocalDateKey());

  useEffect(() => {
    setSessionDate(todayLocalDateKey());
  }, []);

  return (
    <>
      <AppNav current="/" />
      <div className="mx-auto flex min-w-0 max-w-lg flex-col gap-8 overflow-x-hidden px-4 py-12">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            筋トレ記録
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            日付を決めて記録を開始するか、メニュー提案ページで条件を整えてから生成できます。データは基本は端末のみに保存されます。
          </p>
        </div>

        <div className="min-w-0 max-w-full rounded-2xl border border-zinc-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
          <label
            htmlFor="session-date"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-200"
          >
            トレーニング日
          </label>
          <input
            id="session-date"
            type="date"
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
            className="date-input-native mt-2 box-border w-full min-w-0 max-w-full rounded-xl border border-zinc-300/80 bg-white/90 px-3 py-3 text-base text-zinc-900 dark:border-white/15 dark:bg-zinc-900/70 dark:text-zinc-50 sm:px-4"
          />
        </div>

        <button
          type="button"
          onClick={() => router.push(`/day/${sessionDate}`)}
          className="rounded-2xl bg-violet-600 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-violet-500/30 transition hover:bg-violet-500 active:scale-[0.99] dark:bg-violet-500/90 dark:hover:bg-violet-400"
        >
          この日の記録を開く
        </button>

        <div className="rounded-2xl border border-zinc-200/80 bg-white/70 p-5 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.03]">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            ほかの操作
          </p>
          <ul className="mt-3 space-y-3 text-sm">
            <li>
              <Link
                href="/suggest"
                className="font-medium text-violet-700 underline-offset-2 hover:underline dark:text-violet-300"
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
                className="font-medium text-violet-700 underline-offset-2 hover:underline dark:text-violet-300"
              >
                種目別の記録
              </Link>
            </li>
            <li>
              <Link
                href="/progress"
                className="font-medium text-violet-700 underline-offset-2 hover:underline dark:text-violet-300"
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
