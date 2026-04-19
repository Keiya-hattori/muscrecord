"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { WorkoutSessionClient } from "@/components/WorkoutSessionClient";

function WorkoutSessionGate() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  if (!id?.trim()) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-zinc-600 dark:text-zinc-400">
        セッションが指定されていません。ホームから開き直してください。
      </div>
    );
  }
  return <WorkoutSessionClient key={id} workoutId={id} />;
}

export default function WorkoutPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-zinc-500">
          読み込み中…
        </div>
      }
    >
      <WorkoutSessionGate />
    </Suspense>
  );
}
