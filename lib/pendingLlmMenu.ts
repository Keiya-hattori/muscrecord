import type { SuggestResponse } from "@/lib/suggestionSchema";

export type PendingLlmMenuRow = {
  id: string;
  exerciseId: string;
  weightKg: number;
  reps: number;
  /** 下の記録へ追加済み（ToDo 行は残す） */
  applied?: boolean;
};

export type PendingLlmMenuPayload = {
  title?: string;
  rows: PendingLlmMenuRow[];
};

function isRow(x: unknown): x is PendingLlmMenuRow {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (
    typeof o.id !== "string" ||
    typeof o.exerciseId !== "string" ||
    typeof o.weightKg !== "number" ||
    typeof o.reps !== "number" ||
    Number.isNaN(o.weightKg) ||
    Number.isNaN(o.reps)
  ) {
    return false;
  }
  if (o.applied !== undefined && typeof o.applied !== "boolean") return false;
  return true;
}

function isPayload(x: unknown): x is PendingLlmMenuPayload {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (typeof o.title !== "string" && o.title !== undefined) return false;
  if (!Array.isArray(o.rows)) return false;
  return o.rows.every(isRow);
}

export function buildPendingMenuFromSuggestion(
  suggestion: SuggestResponse,
): PendingLlmMenuPayload {
  const rows: PendingLlmMenuRow[] = [];
  for (const item of suggestion.items) {
    for (const s of item.sets) {
      rows.push({
        id: crypto.randomUUID(),
        exerciseId: item.exerciseId,
        weightKg: s.weightKg,
        reps: s.reps,
      });
    }
  }
  return {
    title: suggestion.title,
    rows,
  };
}

export function parsePendingMenuJson(
  json: string | undefined | null,
): PendingLlmMenuPayload | null {
  if (json == null || !String(json).trim()) return null;
  try {
    const data: unknown = JSON.parse(String(json));
    return isPayload(data) ? data : null;
  } catch {
    return null;
  }
}
