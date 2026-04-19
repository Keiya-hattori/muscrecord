"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type DailyPoint = { dateKey: string; label: string; volume: number };
type WeeklyPoint = { weekLabel: string; volume: number; weekStartKey: string };

export function VolumeCharts({
  daily,
  weekly,
}: {
  daily: DailyPoint[];
  weekly: WeeklyPoint[];
}) {
  const hasDaily = daily.some((d) => d.volume > 0);
  const hasWeekly = weekly.some((w) => w.volume > 0);

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          直近14日のボリューム（kg）
        </h3>
        <div className="h-64 w-full rounded-2xl border border-zinc-200 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-900">
          {!hasDaily ? (
            <p className="flex h-full items-center justify-center text-sm text-zinc-500">
              まだデータがありません
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 11 }} width={44} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #e4e4e7",
                    fontSize: 12,
                  }}
                  formatter={(v) => [
                    `${Number(v ?? 0).toLocaleString()} kg`,
                    "ボリューム",
                  ]}
                />
                <Bar dataKey="volume" fill="#2563eb" radius={[4, 4, 0, 0]} name="ボリューム" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          直近8週の週次ボリューム（kg）
        </h3>
        <div className="h-64 w-full rounded-2xl border border-zinc-200 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-900">
          {!hasWeekly ? (
            <p className="flex h-full items-center justify-center text-sm text-zinc-500">
              まだデータがありません
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weekly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
                <XAxis dataKey="weekLabel" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} width={44} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #e4e4e7",
                    fontSize: 12,
                  }}
                  formatter={(v) => [
                    `${Number(v ?? 0).toLocaleString()} kg`,
                    "ボリューム",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="volume"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="ボリューム"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>
    </div>
  );
}
