import { z } from "zod";

/** 設定に保存するのは身体データのみ（提案時に API へ） */
export const userProfileSchema = z.object({
  gender: z
    .enum(["male", "female", "other", "unspecified", ""])
    .default("unspecified"),
  ageYears: z.union([z.number().int().min(1).max(120), z.null()]).default(null),
  heightCm: z.union([z.number().min(50).max(260), z.null()]).default(null),
  bodyWeightKg: z.union([z.number().min(30).max(300), z.null()]).default(null),
});

export type UserProfile = z.infer<typeof userProfileSchema>;

export const defaultUserProfile: UserProfile = {
  gender: "unspecified",
  ageYears: null,
  heightCm: null,
  bodyWeightKg: null,
};

/** メニュー提案 API には、この固定前提＋上記プロフィールをマージして渡す */
export const SUGGEST_FIXED_CONTEXT = {
  trainingFocus: "筋肥大",
  experienceAssumption: "中級（おおよそ1年程度の継続を想定。必要に応じて負荷を調整）",
  equipmentAssumption: "フルジム",
  /** 以前の「60〜90分想定」より控えめ（総セット・種目数もその前提） */
  sessionDurationAssumption: "1セッションおおよそ45〜60分",
} as const;

const bodyPartFocusEnum = z.enum([
  "chest",
  "back",
  "legs",
  "shoulders",
  "triceps",
  "biceps",
]);

export type BodyPartFocus = z.infer<typeof bodyPartFocusEnum>;

/** ホームの部位チップ（表示順） */
export const BODY_FOCUS_CHIPS: { id: BodyPartFocus; label: string }[] = [
  { id: "chest", label: "胸" },
  { id: "back", label: "背中" },
  { id: "legs", label: "足" },
  { id: "shoulders", label: "肩" },
  { id: "triceps", label: "三頭筋" },
  { id: "biceps", label: "二頭筋" },
];

/** ホームから「今日だけ」送るコンディション */
export const todayContextSchema = z.object({
  /** 今日鍛えたい部位（空ならバランスや履歴に任せる） */
  focusBodyParts: z.array(bodyPartFocusEnum).default([]),
  fatigueLevel: z
    .union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
      z.literal(""),
    ])
    .default(""),
  motivation: z.enum(["low", "normal", "high", ""]).default(""),
});

export type TodayContext = z.infer<typeof todayContextSchema>;

export const defaultTodayContext: TodayContext = {
  focusBodyParts: [],
  fatigueLevel: "",
  motivation: "",
};

export function parseUserProfileJson(raw: string | undefined): UserProfile {
  if (!raw) return defaultUserProfile;
  try {
    const j = JSON.parse(raw) as unknown;
    const r = userProfileSchema.safeParse(j);
    if (r.success) return r.data;
    if (j && typeof j === "object" && !Array.isArray(j)) {
      const o = j as Record<string, unknown>;
      return userProfileSchema.parse({
        gender: o.gender,
        ageYears: o.ageYears ?? null,
        heightCm: o.heightCm ?? null,
        bodyWeightKg: o.bodyWeightKg ?? null,
      });
    }
    return defaultUserProfile;
  } catch {
    return defaultUserProfile;
  }
}
