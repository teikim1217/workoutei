import WorkoutRecorder from "@/components/WorkoutRecorder";
import type { ExerciseGroup } from "@/lib/types";

// 등 = 등 + 이두(biceps), 가슴 = 가슴 + 삼두(triceps)
const UPPER_GROUPS: ExerciseGroup[] = [
  {
    name: "등",
    exercises: [
      "Lat pull down",
      "Seated row",
      "Pull up",
      "Bent-over row",
      "T-bar row",
      "Dumbbell curl",
      "Barbell curl",
      "Hammer curl",
    ],
  },
  {
    name: "가슴",
    exercises: [
      "Bench press",
      "Incline bench press",
      "Decline bench press",
      "Butterfly",
      "Chest press",
      "Triceps push down",
      "Overhead extension",
      "Dips",
    ],
  },
  {
    name: "어깨",
    exercises: ["Shoulder press", "Lateral raise", "Front raise", "Reverse fly"],
  },
  {
    name: "복근",
    exercises: ["Crunch", "Leg raise", "Plank", "Hanging leg raise"],
  },
];

export default async function UpperPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  return (
    <WorkoutRecorder category="upper" defaultGroups={UPPER_GROUPS} date={date} />
  );
}
