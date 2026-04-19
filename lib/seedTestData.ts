import { addSet, createWorkoutWithStartedAt } from "@/lib/db";

function startOfDayMs(daysAgo: number): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d.getTime();
}

/** 過去 N 日前の指定ローカル時刻（分単位まで） */
function atDaysAgo(daysAgo: number, hour: number, minute = 0): number {
  return startOfDayMs(daysAgo) + hour * 60 * 60 * 1000 + minute * 60 * 1000;
}

type Block = { exerciseId: string; sets: [weightKg: number, reps: number][] };

/**
 * ベンチ・インクラインダンベル・ラット・懸垂・スクワット・ハーフデッド・ショルダープレス・
 * ライイングEX・アームカール・インクラインアームカール の約2週間分デモ記録。
 * 既存のワークアウトに追加される（上書きしない）。
 */
export async function seedTwoWeekSampleWorkouts(): Promise<{
  workoutCount: number;
  setCount: number;
}> {
  const sessions: {
    daysAgo: number;
    hour: number;
    minute?: number;
    blocks: Block[];
  }[] = [
    {
      daysAgo: 13,
      hour: 19,
      minute: 10,
      blocks: [
        {
          exerciseId: "bench_press",
          sets: [
            [55, 10],
            [57.5, 10],
            [57.5, 8],
          ],
        },
        {
          exerciseId: "incline_dumbbell_press",
          sets: [
            [18, 12],
            [18, 12],
            [20, 10],
          ],
        },
        {
          exerciseId: "ohp",
          sets: [
            [35, 10],
            [35, 10],
            [35, 8],
          ],
        },
        {
          exerciseId: "lying_tricep_extension",
          sets: [
            [20, 12],
            [20, 12],
            [22.5, 10],
          ],
        },
        {
          exerciseId: "bicep_curl",
          sets: [
            [8, 15],
            [8, 15],
            [10, 12],
          ],
        },
      ],
    },
    {
      daysAgo: 12,
      hour: 18,
      minute: 40,
      blocks: [
        {
          exerciseId: "lat_pulldown",
          sets: [
            [40, 12],
            [42.5, 12],
            [45, 10],
          ],
        },
        {
          exerciseId: "pull_up",
          sets: [
            [0, 8],
            [0, 7],
            [0, 6],
          ],
        },
        {
          exerciseId: "squat",
          sets: [
            [70, 10],
            [70, 10],
            [70, 8],
          ],
        },
        {
          exerciseId: "half_deadlift",
          sets: [
            [60, 10],
            [60, 10],
            [65, 8],
          ],
        },
      ],
    },
    {
      daysAgo: 11,
      hour: 20,
      blocks: [
        {
          exerciseId: "bench_press",
          sets: [
            [57.5, 10],
            [60, 10],
            [60, 8],
          ],
        },
        {
          exerciseId: "lat_pulldown",
          sets: [
            [45, 10],
            [45, 10],
            [47.5, 8],
          ],
        },
        {
          exerciseId: "incline_bicep_curl",
          sets: [
            [8, 12],
            [8, 12],
            [10, 10],
          ],
        },
        {
          exerciseId: "ohp",
          sets: [
            [37.5, 10],
            [37.5, 10],
            [37.5, 8],
          ],
        },
      ],
    },
    {
      daysAgo: 10,
      hour: 19,
      minute: 5,
      blocks: [
        {
          exerciseId: "squat",
          sets: [
            [72.5, 10],
            [75, 10],
            [75, 8],
          ],
        },
        {
          exerciseId: "half_deadlift",
          sets: [
            [65, 10],
            [67.5, 8],
            [67.5, 8],
          ],
        },
        {
          exerciseId: "pull_up",
          sets: [
            [0, 8],
            [0, 8],
            [0, 7],
          ],
        },
        {
          exerciseId: "lat_pulldown",
          sets: [
            [47.5, 10],
            [50, 10],
            [50, 8],
          ],
        },
      ],
    },
    {
      daysAgo: 9,
      hour: 18,
      minute: 15,
      blocks: [
        {
          exerciseId: "incline_dumbbell_press",
          sets: [
            [20, 12],
            [22, 10],
            [22, 10],
          ],
        },
        {
          exerciseId: "lying_tricep_extension",
          sets: [
            [22.5, 12],
            [25, 10],
            [25, 10],
          ],
        },
        {
          exerciseId: "bicep_curl",
          sets: [
            [10, 12],
            [10, 12],
            [12, 10],
          ],
        },
      ],
    },
    {
      daysAgo: 7,
      hour: 19,
      minute: 45,
      blocks: [
        {
          exerciseId: "bench_press",
          sets: [
            [60, 10],
            [62.5, 8],
            [62.5, 8],
          ],
        },
        {
          exerciseId: "squat",
          sets: [
            [77.5, 8],
            [80, 8],
            [80, 6],
          ],
        },
        {
          exerciseId: "lat_pulldown",
          sets: [
            [47.5, 12],
            [50, 10],
            [50, 10],
          ],
        },
      ],
    },
    {
      daysAgo: 5,
      hour: 20,
      blocks: [
        {
          exerciseId: "pull_up",
          sets: [
            [0, 9],
            [0, 8],
            [0, 7],
          ],
        },
        {
          exerciseId: "lat_pulldown",
          sets: [
            [50, 10],
            [52.5, 8],
            [52.5, 8],
          ],
        },
        {
          exerciseId: "half_deadlift",
          sets: [
            [70, 8],
            [72.5, 8],
            [72.5, 6],
          ],
        },
        {
          exerciseId: "incline_bicep_curl",
          sets: [
            [10, 12],
            [10, 12],
            [12, 8],
          ],
        },
      ],
    },
    {
      daysAgo: 4,
      hour: 18,
      minute: 30,
      blocks: [
        {
          exerciseId: "ohp",
          sets: [
            [40, 10],
            [40, 10],
            [42.5, 8],
          ],
        },
        {
          exerciseId: "incline_dumbbell_press",
          sets: [
            [22, 12],
            [24, 10],
            [24, 8],
          ],
        },
        {
          exerciseId: "lying_tricep_extension",
          sets: [
            [25, 12],
            [27.5, 10],
            [27.5, 8],
          ],
        },
        {
          exerciseId: "bicep_curl",
          sets: [
            [12, 12],
            [12, 10],
            [14, 8],
          ],
        },
      ],
    },
    {
      daysAgo: 2,
      hour: 19,
      minute: 0,
      blocks: [
        {
          exerciseId: "bench_press",
          sets: [
            [62.5, 10],
            [65, 8],
            [65, 8],
          ],
        },
        {
          exerciseId: "lat_pulldown",
          sets: [
            [52.5, 10],
            [55, 8],
            [55, 8],
          ],
        },
        {
          exerciseId: "squat",
          sets: [
            [82.5, 8],
            [85, 6],
            [85, 5],
          ],
        },
        {
          exerciseId: "pull_up",
          sets: [
            [0, 10],
            [0, 9],
            [0, 8],
          ],
        },
        {
          exerciseId: "ohp",
          sets: [
            [42.5, 8],
            [42.5, 8],
            [42.5, 6],
          ],
        },
      ],
    },
    {
      daysAgo: 0,
      hour: 18,
      minute: 20,
      blocks: [
        {
          exerciseId: "bench_press",
          sets: [
            [65, 8],
            [67.5, 6],
            [67.5, 5],
          ],
        },
        {
          exerciseId: "incline_dumbbell_press",
          sets: [
            [24, 10],
            [26, 8],
            [26, 8],
          ],
        },
        {
          exerciseId: "incline_bicep_curl",
          sets: [
            [12, 10],
            [12, 10],
            [14, 8],
          ],
        },
        {
          exerciseId: "half_deadlift",
          sets: [
            [75, 8],
            [75, 8],
            [77.5, 6],
          ],
        },
      ],
    },
  ];

  let setCount = 0;
  const SAMPLE_NOTE = "サンプルデータ（約2週間）";

  for (const s of sessions) {
    const startedAt = atDaysAgo(s.daysAgo, s.hour, s.minute ?? 0);
    const workoutId = await createWorkoutWithStartedAt(startedAt, SAMPLE_NOTE);
    let order = 0;
    for (const b of s.blocks) {
      for (const [weightKg, reps] of b.sets) {
        await addSet({
          workoutId,
          exerciseId: b.exerciseId,
          order: order++,
          weightKg,
          reps,
        });
        setCount++;
      }
    }
  }

  return { workoutCount: sessions.length, setCount };
}
