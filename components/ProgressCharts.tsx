"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  loadVolumeChartSeries,
  type VolumeChartPeriod,
  type VolumeChartPayload,
} from "@/lib/volumeChartData";
import {
  PPL_COLORS,
  PPL_LABELS,
  SIX_COLORS,
  SIX_LABELS,
  splitKeysForMode,
  type PplKey,
  type SixKey,
  type VolumeSplitMode,
} from "@/lib/volumeSplit";

const PERIODS: { id: VolumeChartPeriod; label: string }[] = [
  { id: "d7", label: "7日" },
  { id: "d30", label: "30日" },
  { id: "w9", label: "9週" },
  { id: "m6", label: "半年" },
  { id: "all", label: "累計" },
];

function totalVolumeRow(
  row: Record<string, string | number>,
  keys: readonly string[],
): number {
  return keys.reduce((s, k) => {
    const v = row[k];
    return s + (typeof v === "number" ? v : 0);
  }, 0);
}

function seriesLabel(mode: VolumeSplitMode, k: string): string {
  if (mode === "ppl") return PPL_LABELS[k as PplKey];
  return SIX_LABELS[k as SixKey];
}

function seriesColor(mode: VolumeSplitMode, k: string): string {
  if (mode === "ppl") return PPL_COLORS[k as keyof typeof PPL_COLORS] ?? "#71717a";
  return SIX_COLORS[k as keyof typeof SIX_COLORS] ?? "#71717a";
}

export function VolumeCharts({ dataRevision }: { dataRevision: number }) {
  const [period, setPeriod] = useState<VolumeChartPeriod>("d30");
  const [mode, setMode] = useState<VolumeSplitMode>("ppl");
  const [payload, setPayload] = useState<VolumeChartPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const p = await loadVolumeChartSeries(period, mode);
        if (!cancelled) setPayload(p);
      } catch {
        if (!cancelled) setPayload(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [period, mode, dataRevision]);

  const keys = useMemo(() => [...splitKeysForMode(mode)], [mode]);

  const hasData = useMemo(() => {
    if (!payload) return false;
    if (payload.kind === "daily") {
      return payload.rows.some((r) => totalVolumeRow(r, keys) > 0);
    }
    return payload.rows.some((r) => totalVolumeRow(r, keys) > 0);
  }, [payload, keys]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">期間</p>
        <div className="flex flex-wrap gap-2">
          {PERIODS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setPeriod(id)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                period === id
                  ? "bg-blue-600 text-white"
                  : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">表示</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode("ppl")}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              mode === "ppl"
                ? "bg-orange-600 text-white"
                : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
            }`}
          >
            PPL（3分割）
          </button>
          <button
            type="button"
            onClick={() => setMode("six")}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              mode === "six"
                ? "bg-orange-600 text-white"
                : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
            }`}
          >
            胸・背中・肩・二頭・三頭・脚
          </button>
        </div>
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-zinc-500">読み込み中…</p>
      ) : !payload ? (
        <p className="py-12 text-center text-sm text-zinc-500">データを読めませんでした</p>
      ) : (
        <>
          <p className="text-xs text-zinc-500">{payload.subtitle}</p>
          <div className="h-72 w-full min-w-0 max-w-full rounded-2xl border border-zinc-200 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-900">
            {!hasData ? (
              <p className="flex h-full items-center justify-center text-sm text-zinc-500">
                この期間・表示ではまだデータがありません
              </p>
            ) : payload.kind === "cumulative" ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={payload.rows} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11 }} width={44} />
                  <Tooltip
                    formatter={(value, name) => [
                      `${Math.round(Number(value ?? 0)).toLocaleString()} kg`,
                      String(name),
                    ]}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #e4e4e7",
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {keys.map((k) => (
                    <Bar
                      key={k}
                      dataKey={k}
                      stackId="cum"
                      fill={seriesColor(mode, k)}
                      name={seriesLabel(mode, k)}
                      radius={[0, 0, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={payload.rows}
                  margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10 }}
                    interval={period === "d30" ? 2 : 0}
                  />
                  <YAxis tick={{ fontSize: 11 }} width={44} />
                  <Tooltip
                    formatter={(value, name) => [
                      `${Math.round(Number(value ?? 0)).toLocaleString()} kg`,
                      String(name),
                    ]}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #e4e4e7",
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {keys.map((k) => (
                    <Line
                      key={k}
                      type="monotone"
                      dataKey={k}
                      stroke={seriesColor(mode, k)}
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      activeDot={{ r: 4 }}
                      name={seriesLabel(mode, k)}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}
    </div>
  );
}
