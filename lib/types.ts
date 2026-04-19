export type ExerciseCategory =
  | "chest"
  | "back"
  | "legs"
  | "shoulders"
  | "arms"
  | "core";

export type ExerciseMaster = {
  id: string;
  name: string;
  category: ExerciseCategory;
  /** public からのパス（先頭スラッシュ付き） */
  imagePath: string;
};

export type WorkoutSessionRow = {
  id: string;
  /** セッション作成時刻（並び・「前回」参照に使用） */
  startedAt: number;
  /** トレーニング日（ローカル暦・YYYY-MM-DD） */
  sessionDate: string;
  note?: string;
};

export type WorkoutSetRow = {
  /** Dexie auto-increment は使わず UUID で安定参照 */
  id: string;
  workoutId: string;
  exerciseId: string;
  /** セッション内の表示順 */
  order: number;
  weightKg: number;
  reps: number;
};
