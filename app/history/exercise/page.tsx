import { Suspense } from "react";
import { AppNav } from "@/components/AppNav";
import { ExerciseHistoryExerciseGate } from "@/components/ExerciseHistoryExerciseGate";

export const metadata = {
  title: "種目の全日記録",
};

export default function ExerciseHistoryPage() {
  return (
    <div className="min-h-screen">
      <AppNav current="/history" />
      <Suspense
        fallback={
          <p className="px-4 py-12 text-center text-sm text-zinc-500">
            読み込み中…
          </p>
        }
      >
        <ExerciseHistoryExerciseGate />
      </Suspense>
    </div>
  );
}
