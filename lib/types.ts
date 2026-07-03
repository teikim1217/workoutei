// 운동 기록 데이터 타입 정의 (PRD 4번 데이터 모델)

export interface SetRecord {
  weightKg: number;
  reps: number;
}

export interface ExerciseRecord {
  name: string;                    // 예: "Lat pull down"
  category: "upper" | "lower";
  sets: SetRecord[];               // 입력 순서 유지
}

export interface RunningRecord {
  distanceKm: number;
  durationMin: number;
  type: "indoor" | "outdoor";
}

export interface WorkoutSession {
  id: string;
  date: string;                    // "2026-07-23" 형식
  running?: RunningRecord;
  exercises: ExerciseRecord[];
}

// 종목 선택 화면의 하위 카테고리 그룹 (예: "등", "가슴")
export interface ExerciseGroup {
  name: string;
  exercises: string[];
}
