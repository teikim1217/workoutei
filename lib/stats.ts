// 통계 계산용 순수 함수 (localStorage 접근 없음 — 세션 배열을 받아 계산)
// 저장/조회는 storage.ts, 파생 계산은 여기로 분리.

import type { SetRecord, WorkoutSession } from "./types";

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
