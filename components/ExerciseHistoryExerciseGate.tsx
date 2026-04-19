"use client";

import { useSearchParams } from "next/navigation";
import { ExerciseHistoryDetailClient } from "@/components/ExerciseHistoryDetailClient";

export function ExerciseHistoryExerciseGate() {
  const sp = useSearchParams();
  const id = sp.get("exerciseId")?.trim();
  if (!id) {
    return (
      <p className="mx-auto max-w-lg px-4 py-12 text-center text-sm text-zinc-500">
        種目が指定されていません。種目別の記録から「過去分すべて」を開いてください。
      </p>
    );
  }
  return <ExerciseHistoryDetailClient exerciseId={id} />;
}
