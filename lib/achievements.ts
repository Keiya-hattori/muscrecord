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
    id: "sessions_50",
    title: "ジムの常連",
    description: "累計50セッション達成",
    icon: "🎫",
  },
  {
    id: "sessions_100",
    title: "百年ジム",
    description: "累計100セッション達成",
    icon: "💯",
  },
  {
    id: "sessions_200",
    title: "レジェンド入り",
    description: "累計200セッション達成",
    icon: "👑",
  },
  {
    id: "sessions_300",
    title: "三百の刻",
    description: "累計300セッション達成",
    icon: "🔱",
  },
  {
    id: "sessions_500",
    title: "ハーフ・サウザンド",
    description: "累計500セッション達成",
    icon: "🎖️",
  },
  {
    id: "sets_50",
    title: "セット職人",
    description: "累計メインセット数 50 回（ウォームアップ等を除く）",
    icon: "🔢",
  },
  {
    id: "sets_200",
    title: "ボリューム蓄積",
    description: "累計メインセット数 200 回（ウォームアップ等を除く）",
    icon: "📊",
  },
  {
    id: "sets_500",
    title: "セットマシン",
    description: "累計メインセット数 500 回（ウォームアップ等を除く）",
    icon: "🤖",
  },
  {
    id: "sets_1000",
    title: "千回の反復",
    description: "累計メインセット数 1,000 回（ウォームアップ等を除く）",
    icon: "🔥",
  },
  {
    id: "sets_2000",
    title: "反復の化身",
    description: "累計メインセット数 2,000 回（ウォームアップ等を除く）",
    icon: "💪",
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
    id: "volume_100k",
    title: "十トン級",
    description: "累計ボリューム 100,000 kg",
    icon: "🐘",
  },
  {
    id: "volume_250k",
    title: "鋼の蓄積",
    description: "累計ボリューム 250,000 kg",
    icon: "🏗️",
  },
  {
    id: "volume_500k",
    title: "半ミリオン",
    description: "累計ボリューム 500,000 kg",
    icon: "🌋",
  },
  {
    id: "volume_1m",
    title: "メガトン級",
    description: "累計ボリューム 1,000,000 kg",
    icon: "🛰️",
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
  {
    id: "variety_12",
    title: "種目コレクター",
    description: "12種目以上を記録した",
    icon: "🃏",
  },
  {
    id: "variety_15",
    title: "部位の探索者",
    description: "15種目以上を記録した",
    icon: "🧭",
  },
  {
    id: "variety_20",
    title: "マスター・オブ・バリエーション",
    description: "20種目以上を記録した",
    icon: "🌈",
  },
  {
    id: "variety_25",
    title: "フルライブラリ",
    description: "25種目以上を記録した",
    icon: "📚",
  },
  {
    id: "growth_30d_10",
    title: "伸び盛り",
    description: "直近30日のボリュームが、その前の30日比で10%以上アップ",
    icon: "📈",
  },
  {
    id: "growth_30d_25",
    title: "急成長",
    description: "直近30日のボリュームが、その前の30日比で25%以上アップ",
    icon: "🚀",
  },
  {
    id: "growth_30d_50",
    title: "ブレイクスルー",
    description: "直近30日のボリュームが、その前の30日比で50%以上アップ",
    icon: "💥",
  },
  {
    id: "freq_30d_8",
    title: "週2の壁を越えて",
    description: "直近30日に8回以上トレーニングを記録",
    icon: "📆",
  },
  {
    id: "freq_30d_12",
    title: "週3ペース",
    description: "直近30日に12回以上トレーニングを記録",
    icon: "🗓️",
  },
  {
    id: "avg_vol_4k",
    title: "ヘビーセッション",
    description: "累計の平均セッションボリュームが 4,000 kg 以上",
    icon: "⚖️",
  },
  {
    id: "avg_vol_8k",
    title: "ハイボリューム・ラン",
    description: "累計の平均セッションボリュームが 8,000 kg 以上",
    icon: "🏋️‍♂️",
  },
  {
    id: "volume_density",
    title: "高密度トレーニング",
    description: "累計セット数 300 回以上かつ 10 セッション以上",
    icon: "📦",
  },
  {
    id: "balanced_lifter",
    title: "バランスリフター",
    description: "累計10セッション以上かつ 8 種目以上を記録",
    icon: "🧩",
  },
];

export type AchievementStatus = AchievementDef & { unlocked: boolean };

export function evaluateAchievements(a: GlobalAggregates): AchievementStatus[] {
  const g = a.volumeGrowth30dPct;
  const checks: Record<string, boolean> = {
    first_log: a.totalWorkouts >= 1,
    sessions_5: a.totalWorkouts >= 5,
    sessions_10: a.totalWorkouts >= 10,
    sessions_30: a.totalWorkouts >= 30,
    sessions_50: a.totalWorkouts >= 50,
    sessions_100: a.totalWorkouts >= 100,
    sessions_200: a.totalWorkouts >= 200,
    sessions_300: a.totalWorkouts >= 300,
    sessions_500: a.totalWorkouts >= 500,
    sets_50: a.totalSets >= 50,
    sets_200: a.totalSets >= 200,
    sets_500: a.totalSets >= 500,
    sets_1000: a.totalSets >= 1000,
    sets_2000: a.totalSets >= 2000,
    volume_10k: a.totalVolume >= 10_000,
    volume_50k: a.totalVolume >= 50_000,
    volume_100k: a.totalVolume >= 100_000,
    volume_250k: a.totalVolume >= 250_000,
    volume_500k: a.totalVolume >= 500_000,
    volume_1m: a.totalVolume >= 1_000_000,
    variety_5: a.uniqueExerciseCount >= 5,
    variety_10: a.uniqueExerciseCount >= 10,
    variety_12: a.uniqueExerciseCount >= 12,
    variety_15: a.uniqueExerciseCount >= 15,
    variety_20: a.uniqueExerciseCount >= 20,
    variety_25: a.uniqueExerciseCount >= 25,
    growth_30d_10:
      g !== null && a.volumePrev30Days > 0 && g >= 10,
    growth_30d_25:
      g !== null && a.volumePrev30Days > 0 && g >= 25,
    growth_30d_50:
      g !== null && a.volumePrev30Days > 0 && g >= 50,
    freq_30d_8: a.sessionsLast30Days >= 8,
    freq_30d_12: a.sessionsLast30Days >= 12,
    avg_vol_4k: a.avgVolumePerSession >= 4000,
    avg_vol_8k: a.avgVolumePerSession >= 8000,
    volume_density: a.totalSets >= 300 && a.totalWorkouts >= 10,
    balanced_lifter: a.totalWorkouts >= 10 && a.uniqueExerciseCount >= 8,
  };

  return ACHIEVEMENTS.map((def) => ({
    ...def,
    unlocked: checks[def.id] ?? false,
  }));
}

export function countUnlocked(list: AchievementStatus[]): number {
  return list.filter((x) => x.unlocked).length;
}
