import { GoogleGenerativeAI } from "@google/generative-ai";
import rawExercises from "@/lib/exercises.json";
import { TRAINING_ENGINE_SYSTEM_PROMPT } from "@/lib/prompts/trainingSuggestSystem";
import { suggestResponse } from "@/lib/suggestionSchema";
import type { SuggestResponse } from "@/lib/suggestionSchema";
import { SUGGEST_FIXED_CONTEXT } from "@/lib/userProfile";
import type { TodayContext, UserProfile } from "@/lib/userProfile";

const allowedIds = new Set(
  (rawExercises as { id: string }[]).map((e) => e.id),
);

/** JSON モードでもまれにフェンスで囲まれる場合のフォールバック */
export function parseObjectFromLlmText(text: string): unknown {
  const t = text.trim();
  try {
    return JSON.parse(t);
  } catch {
    const m = /```(?:json)?\s*([\s\S]*?)```/i.exec(t);
    if (m?.[1]) return JSON.parse(m[1].trim());
    throw new Error("parse");
  }
}

export type WorkoutSuggestInput = {
  historySummary: string;
  perExerciseLatest?: string;
  userProfile?: UserProfile;
  todayContext?: TodayContext;
};

/**
 * メニュー提案（ブラウザまたは Node から呼べる）。
 * GitHub Pages など静的ホスティングでは API が使えないためクライアントから呼ぶ。
 */
export async function generateWorkoutSuggestion(
  apiKey: string,
  input: WorkoutSuggestInput,
  modelId: string,
): Promise<SuggestResponse> {
  const exerciseIds = (rawExercises as { id: string }[])
    .map((e) => e.id)
    .join(", ");

  const profileForLlm = {
    アプリ前提: SUGGEST_FIXED_CONTEXT,
    ユーザー入力_からだの情報: input.userProfile ?? {},
  };

  const userPayload = [
    "## 使用可能な exerciseId（この id のみ items に使用）",
    exerciseIds,
    "",
    "## ユーザープロフィール（アプリ前提＋設定で入力した身長・体重など）",
    JSON.stringify(profileForLlm, null, 2),
    "",
    "## 今日のコンディション（提案ボタン時点）",
    input.todayContext
      ? JSON.stringify(input.todayContext, null, 2)
      : "（未入力）",
    "",
    "## 直近セッションの要約（JSON）",
    input.historySummary,
    "",
    "## 種目ごとの直近実績（各種目・直近セッションのセット一覧）",
    input.perExerciseLatest ?? "（データなし）",
    "",
    "上記をすべて考慮し、ルールに従って今日のメニューを JSON で返してください。items[].exerciseId は必ず許可リストの id のみ。",
  ].join("\n");

  const systemPrompt = `${TRAINING_ENGINE_SYSTEM_PROMPT}

---

【許可される exerciseId】
以下はアプリが定義した種目 id の一覧です。items[].exerciseId はここからのみ選択すること。
${exerciseIds}`;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelId,
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature: 0.35,
      responseMimeType: "application/json",
    },
  });

  let content: string;
  try {
    const result = await model.generateContent(userPayload);
    content = result.response.text();
  } catch (err) {
    throw new Error(
      err instanceof Error ? err.message : "Gemini API 呼び出しに失敗しました。",
    );
  }

  if (!content?.trim()) {
    throw new Error(
      "LLM から応答がありませんでした（安全性フィルタなどの可能性があります）。",
    );
  }

  let data: unknown;
  try {
    data = parseObjectFromLlmText(content);
  } catch {
    throw new Error("LLM の応答が JSON として解析できませんでした。");
  }

  const validated = suggestResponse.safeParse(data);
  if (!validated.success) {
    throw new Error("LLM の応答が期待した形式と一致しませんでした。");
  }

  for (const item of validated.data.items) {
    if (!allowedIds.has(item.exerciseId)) {
      throw new Error(
        `LLM が不正な exerciseId を返しました: ${item.exerciseId}`,
      );
    }
  }

  return validated.data;
}
