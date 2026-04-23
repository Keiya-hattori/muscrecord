"use client";

import { useEffect, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { Big3RecordsWidget } from "@/components/Big3RecordsWidget";
import { todayLocalDateKey } from "@/lib/dateKey";

export function HomeClient() {
  const [sessionDate, setSessionDate] = useState(() => todayLocalDateKey());

  useEffect(() => {
    setSessionDate(todayLocalDateKey());
  }, []);

  const openDayRecord = () => {
    const v = sessionDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return;
    /**
     * 一部環境（特に静的ホスティング）で、クライアント遷移直後だけ
     * /day ページが落ちてリロードで復帰する事象があるため、ここは
     * フル遷移で確実に開く。
     */
    const target = new URL(`day/${v}`, window.location.href).toString();
    window.location.assign(target);
  };

  return (
    <>
      <AppNav current="/" />
      <div className="mx-auto flex min-w-0 max-w-lg flex-col gap-8 overflow-x-hidden px-4 py-12">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            筋トレ記録
          </h1>
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
          onClick={openDayRecord}
          className="rounded-2xl bg-violet-600 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-violet-500/30 transition hover:bg-violet-500 active:scale-[0.99] dark:bg-violet-500/90 dark:hover:bg-violet-400"
        >
          この日の記録を開く
        </button>

        <Big3RecordsWidget />
      </div>
    </>
  );
}
