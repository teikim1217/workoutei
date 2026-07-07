// 통계 계산용 순수 함수 (localStorage 접근 없음 — 세션 배열을 받아 계산)
// 저장/조회는 storage.ts, 파생 계산은 여기로 분리.

import type {
  ExerciseRecord,
  RunningRecord,
  SetRecord,
  WorkoutSession,
} from "./types";

// 요약 표시용: 러닝/종목을 한 목록으로 묶은 항목 (종류 구분)
export type SessionItem =
  | { kind: "running"; running: RunningRecord }
  | { kind: "exercise"; exercise: ExerciseRecord };

// 세션의 러닝·종목을 "저장한 순서"대로 반환.
// savedAt(저장 시각)이 있으면 그 순서, 없으면(과거 데이터) 러닝 먼저 + 종목 배열 순서 유지.
export function orderedItems(session: WorkoutSession): SessionItem[] {
  const rows: { item: SessionItem; savedAt: number; tie: number }[] = [];
  let tie = 0;
  if (session.running) {
    rows.push({
      item: { kind: "running", running: session.running },
      savedAt: session.running.savedAt ?? 0,
      tie: tie++,
    });
  }
  for (const ex of session.exercises) {
    rows.push({
      item: { kind: "exercise", exercise: ex },
      savedAt: ex.savedAt ?? 0,
      tie: tie++,
    });
  }
  // savedAt 오름차순, 동률(과거 데이터 등)이면 원래 순서(tie) 유지
  rows.sort((a, b) => a.savedAt - b.savedAt || a.tie - b.tie);
  return rows.map((r) => r.item);
}

// "최대" 세트: 중량 최대, 동률이면 횟수 많은 쪽 (PRD 요약 규칙)
export function maxSet(sets: SetRecord[]): SetRecord {
  return sets.reduce((best, s) => {
    if (s.weightKg > best.weightKg) return s;
    if (s.weightKg === best.weightKg && s.reps > best.reps) return s;
    return best;
  }, sets[0]);
}

// 기록이 있는 모든 종목 이름 (중복 제거, 이름순 정렬)
export function getExerciseNames(sessions: WorkoutSession[]): string[] {
  const names = new Set<string>();
  for (const s of sessions) {
    for (const e of s.exercises) names.add(e.name);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

// 종목의 날짜별 최고 중량 한 점
export interface MaxPoint {
  date: string; // "YYYY-MM-DD"
  weightKg: number;
  reps: number;
}

// 특정 종목의 날짜별 최고중량 시계열 (cutoffDate 이후, 날짜 오름차순).
// cutoffDate 포함 이후("YYYY-MM-DD" 문자열 비교)만 남긴다.
export function getExerciseMaxSeries(
  sessions: WorkoutSession[],
  name: string,
  cutoffDate: string,
): MaxPoint[] {
  const points: MaxPoint[] = [];
  for (const s of sessions) {
    if (s.date < cutoffDate) continue;
    const ex = s.exercises.find((e) => e.name === name);
    if (!ex || ex.sets.length === 0) continue;
    const m = maxSet(ex.sets);
    points.push({ date: s.date, weightKg: m.weightKg, reps: m.reps });
  }
  return points.sort((a, b) => a.date.localeCompare(b.date));
}
