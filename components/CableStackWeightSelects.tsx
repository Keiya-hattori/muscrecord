"use client";

import {
  CABLE_ADDON_KG,
  combineCableStackWeight,
  decomposeCableStackWeight,
  getCableBaseStackOptions,
  snapWeightToStepKg,
} from "@/lib/recordBodyTabs";

type Props = {
  exerciseId: string;
  weightKg: number;
  onWeightChange: (w: number) => void;
  selectClassName: string;
  idPrefix: string;
};

function fmtKgLine(w: number) {
  return w % 1 === 0 ? `${w} kg` : `${w.toFixed(1)} kg`;
}

export function CableStackWeightSelects({
  exerciseId,
  weightKg,
  onWeightChange,
  selectClassName,
  idPrefix,
}: Props) {
  const w = snapWeightToStepKg(weightKg, exerciseId);
  const { base, addon } = decomposeCableStackWeight(w, exerciseId);
  const bases = getCableBaseStackOptions();

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3">
      <div>
        <label
          className="mb-1 block text-center text-xs font-medium text-zinc-500"
          htmlFor={`${idPrefix}-stack`}
        >
          スタック
        </label>
        <select
          id={`${idPrefix}-stack`}
          className={selectClassName}
          value={base}
          onChange={(e) => {
            const nextBase = Number(e.target.value);
            onWeightChange(
              combineCableStackWeight(nextBase, addon, exerciseId),
            );
          }}
        >
          {bases.map((b) => (
            <option key={b} value={b}>
              {fmtKgLine(b)}
            </option>
          ))}
        </select>
        <p className="mt-1 text-center text-[10px] text-zinc-400">
          1.25kg から 2.5kg 刻み
        </p>
      </div>
      <div>
        <label
          className="mb-1 block text-center text-xs font-medium text-zinc-500"
          htmlFor={`${idPrefix}-addon`}
        >
          0.625kg プレート追加
        </label>
        <select
          id={`${idPrefix}-addon`}
          className={selectClassName}
          value={addon}
          onChange={(e) => {
            const raw = Number(e.target.value);
            const a = CABLE_ADDON_KG.find((x) => x === raw) ?? 0;
            onWeightChange(
              combineCableStackWeight(base, a, exerciseId),
            );
          }}
        >
          {CABLE_ADDON_KG.map((a) => (
            <option key={a} value={a}>
              {a === 0
                ? "なし"
                : a === 0.625
                  ? "1枚（+0.625kg）"
                  : "2枚（+1.25kg）"}
            </option>
          ))}
        </select>
        <p className="mt-1 text-center text-[10px] text-zinc-400">
          上のスタックに足す分
        </p>
      </div>
    </div>
  );
}
