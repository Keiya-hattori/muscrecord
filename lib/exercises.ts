import raw from "@/lib/exercises.json";
import type { ExerciseCategory, ExerciseMaster } from "@/lib/types";

const exercises = raw as ExerciseMaster[];

const categoryLabels: Record<ExerciseCategory, string> = {
  chest: "胸",
  back: "背中",
  legs: "脚",
  shoulders: "肩",
  arms: "腕",
  core: "体幹",
};

export function getAllExercises(): ExerciseMaster[] {
  return exercises;
}

export function getExerciseById(id: string): ExerciseMaster | undefined {
  return exercises.find((e) => e.id === id);
}

export function getCategoryLabel(cat: ExerciseCategory): string {
  return categoryLabels[cat];
}

export function listCategories(): { id: ExerciseCategory; label: string }[] {
  return (Object.keys(categoryLabels) as ExerciseCategory[]).map((id) => ({
    id,
    label: categoryLabels[id],
  }));
}

/** サムネイル読み込み失敗時や補助用のグラデーション（Tailwind） */
export function getCategoryThumbnailClasses(cat: ExerciseCategory): string {
  const map: Record<ExerciseCategory, string> = {
    chest: "bg-gradient-to-br from-rose-500 to-red-800",
    back: "bg-gradient-to-br from-sky-500 to-indigo-900",
    legs: "bg-gradient-to-br from-amber-500 to-orange-800",
    shoulders: "bg-gradient-to-br from-violet-500 to-purple-900",
    arms: "bg-gradient-to-br from-emerald-500 to-teal-900",
    core: "bg-gradient-to-br from-fuchsia-500 to-pink-800",
  };
  return map[cat];
}
