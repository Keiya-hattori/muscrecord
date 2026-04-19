import { notFound } from "next/navigation";
import { DayRecordClient } from "@/components/DayRecordClient";
import { localDateKeyFromMs } from "@/lib/dateKey";

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

type PageProps = {
  params: Promise<{ dateKey: string }>;
};

/** 静的エクスポート用：過去約2年＋先約4ヶ月分の日付をビルド時に生成 */
export function generateStaticParams(): { dateKey: string }[] {
  const out: { dateKey: string }[] = [];
  const now = new Date();
  for (let i = -750; i <= 120; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    out.push({ dateKey: localDateKeyFromMs(d.getTime()) });
  }
  return out;
}

export default async function DayRecordPage(props: PageProps) {
  const params = await props.params;
  if (!DATE_KEY_RE.test(params.dateKey)) {
    notFound();
  }
  return <DayRecordClient dateKey={params.dateKey} />;
}
