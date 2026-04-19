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
