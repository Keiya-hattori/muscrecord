import { z } from "zod";

const suggestSet = z.object({
  weightKg: z.number().nonnegative(),
  reps: z.number().int().nonnegative(),
});

export const suggestItem = z.object({
  exerciseId: z.string(),
  sets: z.array(suggestSet).min(1).max(6),
  /** 例: "8〜12" */
  repRange: z.string().max(50).optional(),
  /** 例: "RIR 1〜2" */
  targetRir: z.string().max(50).optional(),
  /** 推奨重量方針（例: 前回比+2.5kgを狙う） */
  weightPolicy: z.string().max(500).optional(),
  /** 例: "セット間2〜3分" */
  restBetweenSets: z.string().max(80).optional(),
  note: z.string().max(500).optional(),
});

export const suggestResponse = z.object({
  title: z.string().max(120).optional(),
  summary: z.string().max(8000),
  /** 今日の狙い */
  todayFocus: z.string().max(2000).optional(),
  /** 重量アップ条件など */
  progressionHint: z.string().max(2000).optional(),
  /** 入力不足時に置いた仮定の明示 */
  assumptionsMade: z.string().max(3000).optional(),
  items: z.array(suggestItem).min(1).max(8),
});

export type SuggestResponse = z.infer<typeof suggestResponse>;
export type SuggestItem = z.infer<typeof suggestItem>;
