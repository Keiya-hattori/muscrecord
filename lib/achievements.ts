import type { GlobalAggregates } from "@/lib/stats";

export type AchievementDef = {
  id: string;
  title: string;
  description: string;
  icon: string;
};

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "first_log",
    title: "初トレ",
    description: "はじめてトレーニングを記録した",
    icon: "🌱",
  },
  {
    id: "sessions_5",
    title: "記録の習慣",
    description: "累計5セッション達成",
    icon: "📓",
  },
  {
    id: "sessions_10",
    title: "継続の芽",
    description: "累計10セッション達成",
    icon: "🌿",
  },
  {
    id: "sessions_30",
    title: "筋トレ生活",
    description: "累計30セッション達成",
    icon: "🏋️",
  },
  {
    id: "sets_50",
    title: "セット職人",
    description: "累計セット数 50 回",
    icon: "🔢",
  },
  {
    id: "sets_200",
    title: "ボリューム蓄積",
    description: "累計セット数 200 回",
    icon: "📊",
  },
  {
    id: "volume_10k",
    title: "トン級の一歩",
    description: "累計ボリューム 10,000 kg（重量×回数）",
    icon: "⚡",
  },
  {
    id: "volume_50k",
    title: "重量級チャレンジャー",
    description: "累計ボリューム 50,000 kg",
    icon: "🏆",
  },
  {
    id: "variety_5",
    title: "バランス志向",
    description: "5種目以上を記録した",
    icon: "🎯",
  },
  {
    id: "variety_10",
    title: "オールラウンダー",
    description: "10種目以上を記録した",
    icon: "✨",
  },
];

export type AchievementStatus = AchievementDef & { unlocked: boolean };

export function evaluateAchievements(a: GlobalAggregates): AchievementStatus[] {
  const checks: Record<string, boolean> = {
    first_log: a.totalWorkouts >= 1,
    sessions_5: a.totalWorkouts >= 5,
    sessions_10: a.totalWorkouts >= 10,
    sessions_30: a.totalWorkouts >= 30,
    sets_50: a.totalSets >= 50,
    sets_200: a.totalSets >= 200,
    volume_10k: a.totalVolume >= 10_000,
    volume_50k: a.totalVolume >= 50_000,
    variety_5: a.uniqueExerciseCount >= 5,
    variety_10: a.uniqueExerciseCount >= 10,
  };

  return ACHIEVEMENTS.map((def) => ({
    ...def,
    unlocked: checks[def.id] ?? false,
  }));
}

export function countUnlocked(list: AchievementStatus[]): number {
  return list.filter((x) => x.unlocked).length;
}
