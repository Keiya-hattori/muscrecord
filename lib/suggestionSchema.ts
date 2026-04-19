import { z } from "zod";

const suggestSet = z.object({
  weightKg: z.number().nonnegative(),
  reps: z.number().int().nonnegative(),
});

export const suggestItem = z.object({
  exerciseId: z.string(),
  sets: z.array(suggestSet).min(1).max(10),
  note: z.string().max(200).optional(),
});

export const suggestResponse = z.object({
  title: z.string().max(80).optional(),
  summary: z.string().max(2000),
  items: z.array(suggestItem).min(1).max(12),
});

export type SuggestResponse = z.infer<typeof suggestResponse>;
export type SuggestItem = z.infer<typeof suggestItem>;
