import WorkoutRecorder from "@/components/WorkoutRecorder";
import type { ExerciseGroup } from "@/lib/types";

// 하체는 아직 하위 카테고리 없이 단일 그룹 (그룹이 하나라 헤더는 표시되지 않음)
const LOWER_GROUPS: ExerciseGroup[] = [
  {
    name: "하체",
    exercises: ["Squat", "Leg press", "Leg extension", "Leg curl", "Calf raise"],
  },
];

export default async function LowerPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  return (
    <WorkoutRecorder category="lower" defaultGroups={LOWER_GROUPS} date={date} />
  );
}
