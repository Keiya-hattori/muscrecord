"use client";

import clsx from "clsx";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import type { SetKind } from "@/lib/types";
import { normalizeSetKind } from "@/lib/setVolume";

const KIND_ORDER: SetKind[] = ["main", "warmup", "dropset"];

const PANELS: { k: SetKind; title: string; hint: string }[] = [
  { k: "main", title: "メイン", hint: "本番セット" },
  { k: "warmup", title: "ウォームアップ", hint: "W" },
  { k: "dropset", title: "ドロップセット", hint: "D" },
];

const PANEL_BG = [
  "bg-zinc-50/95 dark:bg-zinc-800/90",
  "bg-amber-50/90 dark:bg-amber-950/35",
  "bg-violet-50/85 dark:bg-violet-950/30",
];

type Props = {
  value: SetKind | undefined;
  onChange: (k: SetKind) => void;
  className?: string;
  /**
   * default: 従来の大きいブロック+ラベル
   * bar: 1行用・下敷。親で高さ/幅を与える
   * inline: ラベルなしのコンパクト行（他レイアウト用）
   */
  layout?: "default" | "bar" | "inline";
};

/**
 * 横スナップでセット種類を切り替え。左→メイン、右スクロールで W / D。
 */
export function SetKindSnapPicker({
  value,
  onChange,
  className,
  layout = "default",
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const scrollEndTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  const kind = normalizeSetKind(value);
  const index = KIND_ORDER.indexOf(kind);

  const scrollToIndex = useCallback((i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const w = el.clientWidth;
    if (w <= 0) return;
    const clamped = Math.min(2, Math.max(0, i));
    el.scrollTo({ left: clamped * w, behavior: "auto" });
  }, []);

  useLayoutEffect(() => {
    scrollToIndex(index);
  }, [index, scrollToIndex]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => scrollToIndex(index));
    ro.observe(el);
    return () => ro.disconnect();
  }, [index, scrollToIndex]);

  const handleScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    if (scrollEndTimer.current) clearTimeout(scrollEndTimer.current);
    scrollEndTimer.current = setTimeout(() => {
      const w = el.clientWidth;
      if (w <= 0) return;
      const i = Math.min(2, Math.max(0, Math.round(el.scrollLeft / w)));
      const next = KIND_ORDER[i];
      if (next !== normalizeSetKind(valueRef.current)) onChange(next);
    }, 120);
  }, [onChange]);

  const isBar = layout === "bar";
  const isInline = layout === "inline";
  const showLabel = layout === "default";

  return (
    <div
      className={clsx("relative h-full w-full", className)}
      style={isBar ? { touchAction: "pan-x" } : undefined}
    >
      {showLabel && (
        <p className="mb-1 text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
          左右にスワイプ
        </p>
      )}
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className={clsx(
          "flex snap-x snap-mandatory overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none]",
          "[&::-webkit-scrollbar]:hidden",
          isBar
            ? "h-full w-full touch-pan-x rounded-lg border-0"
            : "rounded-xl border border-zinc-200/90 dark:border-zinc-600",
        )}
        style={{ scrollBehavior: "auto" }}
      >
        {PANELS.map((p, i) => (
          <div
            key={p.k}
            className={clsx(
              "flex min-w-full shrink-0 snap-center flex-col items-center justify-center",
              isBar
                ? "h-full min-h-0 text-[10px] leading-tight sm:text-xs"
                : isInline
                  ? "min-h-[2.5rem] px-2 py-1 text-xs"
                  : "min-h-[3.25rem] px-3 py-2 text-sm",
              PANEL_BG[i],
            )}
          >
            <span
              className={clsx(
                "font-bold text-zinc-800 dark:text-zinc-100",
                isBar && "text-[10px] sm:text-xs",
                !isBar && !isInline && "text-sm",
              )}
            >
              {p.title}
            </span>
            {!isBar && (
              <span
                className={clsx(
                  "text-zinc-500 dark:text-zinc-400",
                  isInline ? "text-[9px]" : "text-[10px]",
                )}
              >
                {p.hint}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
