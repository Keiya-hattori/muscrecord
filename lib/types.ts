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
  /** category が arms のとき、記録画面の二頭／三頭タブ分け用 */
  armFocus?: "bicep" | "tricep";
};

/** ソロ = 1人、合同 = 誰かと一緒 */
export type TrainingContext = "solo" | "partner";

export type WorkoutSessionRow = {
  id: string;
  /** セッション作成時刻（並び・「前回」参照に使用） */
  startedAt: number;
  /** トレーニング日（ローカル暦・YYYY-MM-DD） */
  sessionDate: string;
  note?: string;
  /**
   * LLM 提案メニューを ToDo として保持（JSON: PendingLlmMenuPayload）。
   * チェックでセット記録に移すまで本テーブルには入れない。
   */
  pendingLlmMenuJson?: string;
  /** この日のトレがソロか合同か（未設定可） */
  trainingContext?: TrainingContext | null;
};

export type SetKind = "main" | "warmup" | "dropset";

export type WorkoutSetRow = {
  /** Dexie auto-increment は使わず UUID で安定参照 */
  id: string;
  workoutId: string;
  exerciseId: string;
  /** セッション内の表示順 */
  order: number;
  weightKg: number;
  /** 合計 or 従来の単一回数。片手左右別回数のときは repsLeft+repsRight と同値を推奨 */
  reps: number;
  /** 片手種目: 左の回数（従来データは未設定） */
  repsLeft?: number | null;
  /** 片手種目: 右の回数 */
  repsRight?: number | null;
  /** 未設定はメイン扱い（従来データ互換） */
  setKind?: SetKind;
  /** Reps in Reserve（未入力可） */
  rir?: number | null;
  /** 片手ずつ記録（ダンベル等）。どちらか一方のみなら2倍扱いは UI 任せ。 */
  weightLeftKg?: number | null;
  weightRightKg?: number | null;
};
