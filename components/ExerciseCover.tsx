"use client";

import clsx from "clsx";
import type { ExerciseMaster } from "@/lib/types";
import { getCategoryThumbnailClasses } from "@/lib/exercises";

type Props = {
  exercise: ExerciseMaster;
  className?: string;
  /** 互換用（img では未使用） */
  imageSizes?: string;
};

/**
 * 部位ごとのグラデを常にベースに表示し、その上に画像を薄く重ねる。
 * これで種目一覧で「色が付いている／付いていない」が出ない。
 */
export function ExerciseCover({ exercise, className }: Props) {
  return (
    <div className={clsx("absolute inset-0 overflow-hidden", className)}>
      <div
        className={clsx(
          "absolute inset-0",
          getCategoryThumbnailClasses(exercise.category),
        )}
        aria-hidden
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={exercise.imagePath}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-[0.22]"
        loading="lazy"
        decoding="async"
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
    </div>
  );
}
