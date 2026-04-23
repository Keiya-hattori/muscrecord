"use client";

import clsx from "clsx";
import type { ReactNode } from "react";
import type { SetKind } from "@/lib/types";
import { SetKindSnapPicker } from "@/components/SetKindSnapPicker";

type Props = {
  setLabel: string;
  setKind: SetKind | undefined;
  onSetKind: (k: SetKind) => void;
  rir: number | null;
  onRir: (r: number | null) => void;
  /** 例: 編集/キャンセル/保存。右端。 */
  rightSlot?: ReactNode;
  showDelete?: boolean;
  onDelete?: () => void;
  className?: string;
};

/**
 * 下敷の横スナップ上にオーバーレイ。左にセット、右に RIR。セット行付近のスワイプで切替。
 */
export function SetRowKindRirHeader({
  setLabel,
  setKind,
  onSetKind,
  rir,
  onRir,
  rightSlot,
  showDelete,
  onDelete,
  className,
}: Props) {
  return (
    <div
      className={clsx("relative w-full overflow-hidden rounded-lg", className)}
    >
      <div className="absolute inset-0 z-0" aria-hidden>
        <SetKindSnapPicker
          layout="bar"
          value={setKind}
          onChange={onSetKind}
          className="h-full min-h-[2.75rem] w-full"
        />
      </div>
      <div className="pointer-events-none relative z-10 flex min-h-[2.75rem] w-full max-w-full items-center gap-1 px-1.5 sm:gap-2 sm:px-2">
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <span className="pointer-events-none whitespace-nowrap rounded-md bg-white/90 px-1.5 py-0.5 text-xs font-bold text-zinc-800 shadow-sm dark:bg-zinc-900/90 dark:text-zinc-100">
            {setLabel}
          </span>
          {showDelete && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="pointer-events-auto shrink-0 text-xs text-red-600 hover:underline dark:text-red-400"
            >
              削除
            </button>
          )}
        </div>
        <div className="pointer-events-none min-w-0 flex-1" aria-hidden />
        <label className="pointer-events-auto flex shrink-0 items-center gap-0.5 text-[10px] text-zinc-600 dark:text-zinc-300 sm:gap-1 sm:text-xs">
          RIR
          <select
            value={rir == null ? "" : String(rir)}
            onChange={(e) => {
              const v = e.target.value;
              onRir(v === "" ? null : Number(v));
            }}
            className="min-w-0 max-w-[3.2rem] rounded border border-zinc-200/90 bg-white/95 px-0.5 py-0.5 text-zinc-800 shadow-sm dark:border-zinc-600 dark:bg-zinc-900/95 dark:text-zinc-100"
          >
            <option value="">—</option>
            {Array.from({ length: 11 }, (_, i) => i).map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        {rightSlot ? (
          <div className="pointer-events-auto flex flex-shrink-0 items-center gap-0.5 pl-0.5 sm:pl-1">
            {rightSlot}
          </div>
        ) : null}
      </div>
    </div>
  );
}
