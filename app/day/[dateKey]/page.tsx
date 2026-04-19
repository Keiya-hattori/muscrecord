import { notFound } from "next/navigation";
import { DayRecordClient } from "@/components/DayRecordClient";

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

type PageProps = {
  params: Promise<{ dateKey: string }>;
};

export default async function DayRecordPage(props: PageProps) {
  const params = await props.params;
  if (!DATE_KEY_RE.test(params.dateKey)) {
    notFound();
  }
  return <DayRecordClient dateKey={params.dateKey} />;
}
