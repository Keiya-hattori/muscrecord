import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import rawExercises from "@/lib/exercises.json";
import { TRAINING_ENGINE_SYSTEM_PROMPT } from "@/lib/prompts/trainingSuggestSystem";
import { suggestResponse } from "@/lib/suggestionSchema";
import {
  SUGGEST_FIXED_CONTEXT,
  todayContextSchema,
  userProfileSchema,
} from "@/lib/userProfile";

const allowedIds = new Set(
  (rawExercises as { id: string }[]).map((e) => e.id),
);

export const runtime = "nodejs";

const bodySchema = z.object({
  historySummary: z.string().max(40000),
  /** 種目ごとの直近実績 JSON 文字列 */
  perExerciseLatest: z.string().max(40000).optional(),
  userProfile: userProfileSchema.optional(),
  todayContext: todayContextSchema.optional(),
});

/** JSON モードでもまれにフェンスで囲まれる場合のフォールバック */
function parseObjectFromLlmText(text: string): unknown {
  const t = text.trim();
  try {
    return JSON.parse(t);
  } catch {
    const m = /```(?:json)?\s*([\s\S]*?)```/i.exec(t);
    if (m?.[1]) return JSON.parse(m[1].trim());
    throw new Error("parse");
  }
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "サーバーに GEMINI_API_KEY が設定されていません。.env.local を確認してください。",
      },
      { status: 503 },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "不正な JSON です。" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "入力が不正です。" }, { status: 400 });
  }

  const { historySummary, perExerciseLatest, userProfile, todayContext } =
    parsed.data;

  const exerciseIds = (rawExercises as { id: string }[])
    .map((e) => e.id)
    .join(", ");

  const modelId =
    process.env.WORKOUT_LLM_MODEL ?? "gemini-2.5-flash";

  const profileForLlm = {
    アプリ前提: SUGGEST_FIXED_CONTEXT,
    ユーザー入力_からだの情報: userProfile ?? {},
  };

  const userPayload = [
    "## 使用可能な exerciseId（この id のみ items に使用）",
    exerciseIds,
    "",
    "## ユーザープロフィール（アプリ前提＋設定で入力した身長・体重など）",
    JSON.stringify(profileForLlm, null, 2),
    "",
    "## 今日のコンディション（提案ボタン時点）",
    todayContext
      ? JSON.stringify(todayContext, null, 2)
      : "（未入力）",
    "",
    "## 直近セッションの要約（JSON）",
    historySummary,
    "",
    "## 種目ごとの直近実績（各種目・直近セッションのセット一覧）",
    perExerciseLatest ?? "（データなし）",
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
    const msg =
      err instanceof Error ? err.message : "Gemini API 呼び出しに失敗しました。";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  if (!content?.trim()) {
    return NextResponse.json(
      {
        error:
          "LLM から応答がありませんでした（安全性フィルタなどの可能性があります）。",
      },
      { status: 502 },
    );
  }

  let data: unknown;
  try {
    data = parseObjectFromLlmText(content);
  } catch {
    return NextResponse.json(
      { error: "LLM の応答が JSON として解析できませんでした。" },
      { status: 502 },
    );
  }

  const validated = suggestResponse.safeParse(data);
  if (!validated.success) {
    return NextResponse.json(
      {
        error: "LLM の応答が期待した形式と一致しませんでした。",
        details: validated.error.flatten(),
      },
      { status: 502 },
    );
  }

  for (const item of validated.data.items) {
    if (!allowedIds.has(item.exerciseId)) {
      return NextResponse.json(
        {
          error: `LLM が不正な exerciseId を返しました: ${item.exerciseId}`,
        },
        { status: 502 },
      );
    }
  }

  return NextResponse.json(validated.data);
}
