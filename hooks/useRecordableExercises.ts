"use client";

import { useEffect, useMemo, useState } from "react";
import type { ExerciseMaster } from "@/lib/types";
import { getRecordableExercises } from "@/lib/exercises";
import { subscribeExerciseCatalog } from "@/lib/exerciseCatalog";

/** 設定で種目一覧が変わったときに再計算される */
export function useRecordableExercises(): ExerciseMaster[] {
  const [v, setV] = useState(0);
  useEffect(() => subscribeExerciseCatalog(() => setV((x) => x + 1)), []);
  return useMemo(() => getRecordableExercises(), [v]);
}
