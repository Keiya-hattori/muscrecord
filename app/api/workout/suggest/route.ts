import OpenAI from "openai";
import { NextResponse } from "next/server";
import { z } from "zod";
import rawExercises from "@/lib/exercises.json";
import { suggestResponse } from "@/lib/suggestionSchema";

const allowedIds = new Set(
  (rawExercises as { id: string }[]).map((e) => e.id),
);

export const runtime = "nodejs";

const bodySchema = z.object({
  historySummary: z.string().max(12000),
  userGoal: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "サーバーに OPENAI_API_KEY が設定されていません。.env.local を確認してください。",
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

  const { historySummary, userGoal } = parsed.data;
  const exerciseIds = (rawExercises as { id: string }[])
    .map((e) => e.id)
    .join(", ");

  const model =
    process.env.WORKOUT_LLM_MODEL ?? "gpt-4o-mini";

  const client = new OpenAI({ apiKey });

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `あなたは筋力トレーニングのアシスタントです。ユーザーの過去記録を踏まえて、今日のセッションを提案してください。
出力は必ず一意の JSON オブジェクトのみ。キーは title (任意・短い題名), summary (全体の説明・日本語), items (種目リスト)。
items の各要素は exerciseId (次のリストからのみ選ぶ), sets (重量kgと回数の配列), note (任意)。
過負荷を無理に進めず、セット数は通常3〜5程度、種目は4〜8個程度を目安に。
医療助言や怪我の診断はしない。提案は参考でありユーザーが調整することを前提に書く。
使用可能な exerciseId の一覧（これ以外は禁止）: ${exerciseIds}`,
      },
      {
        role: "user",
        content: [
          "以下は直近セッションの要約です（JSON文字列または箇条書き）。",
          "",
          historySummary,
          "",
          userGoal ? `ユーザー目標メモ: ${userGoal}` : "",
          "",
          "この情報から今日のワークアウト提案を summary と items で返してください。items の exerciseId は必ず許可リストの id のみを使うこと。",
        ].join("\n"),
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    return NextResponse.json(
      { error: "LLM から応答がありませんでした。" },
      { status: 502 },
    );
  }

  let data: unknown;
  try {
    data = JSON.parse(content);
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
