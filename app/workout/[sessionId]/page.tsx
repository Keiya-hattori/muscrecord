import { WorkoutSessionClient } from "@/components/WorkoutSessionClient";

type PageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function WorkoutSessionPage(props: PageProps) {
  const params = await props.params;
  return <WorkoutSessionClient workoutId={params.sessionId} />;
}
