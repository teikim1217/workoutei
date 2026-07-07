// localStorage 기반 저장 모듈
// 나중에 Supabase로 전환할 때 이 파일의 함수 내부만 교체하면 됨

import {
  WorkoutSession,
  ExerciseRecord,
  ExerciseGroup,
  RunningRecord,
} from "./types";

const KEY = "workout-sessions";
const EXERCISE_KEY = "exercise-config";

// 브라우저에서만 실행되도록 보호 (Next.js는 서버에서도 코드를 실행하므로 필수)
function isBrowser(): boolean {
  return typeof window !== "undefined";
}

// 고유 ID 생성.
// crypto.randomUUID()는 보안 컨텍스트(HTTPS/localhost)에서만 동작 →
// 아이폰에서 http://LAN-IP 로 접속하면 없으므로 폴백을 둔다.
function genId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // getRandomValues는 비보안 컨텍스트에서도 사용 가능 → UUID v4 직접 생성
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  ) {
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40; // version 4
    b[8] = (b[8] & 0x3f) | 0x80; // variant
    const hex = Array.from(b, (n) => n.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  // 최후 폴백 (개인용 1인 앱이라 충돌 가능성 무시 가능)
  return `id-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

// 전체 세션 불러오기 (날짜 오름차순)
export function getSessions(): WorkoutSession[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(KEY);
    const list: WorkoutSession[] = raw ? JSON.parse(raw) : [];
    return list.sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

// 특정 날짜 세션 조회
export function getSessionByDate(date: string): WorkoutSession | undefined {
  return getSessions().find((s) => s.date === date);
}

// 러닝 + 상체 + 하체를 모두 포함하면 그날 운동을 "완료"로 본다.
export function isSessionComplete(
  session?: WorkoutSession | null,
): boolean {
  if (!session) return false;
  const hasUpper = session.exercises.some((e) => e.category === "upper");
  const hasLower = session.exercises.some((e) => e.category === "lower");
  return !!session.running && hasUpper && hasLower;
}

// 종목 하나를 그 날짜 세션에 즉시 저장(upsert).
// 같은 이름 종목이 있으면 교체, 없으면 추가. 세션이 없으면 새로 만든다.
// "운동 종료"를 누르지 않아도 종목 저장 시점에 영구 저장되게 하려는 목적.
// (러닝/다른 종목은 건드리지 않아, 한 번 저장한 기록이 그대로 연동된다.)
export function saveExerciseRecord(date: string, record: ExerciseRecord): void {
  if (!isBrowser()) return;
  const sessions = getSessions();
  const existing = sessions.find((s) => s.date === date);
  if (existing) {
    const idx = existing.exercises.findIndex((e) => e.name === record.name);
    if (idx >= 0) {
      // 재저장(수정)이면 원래 저장 순서를 유지하도록 savedAt을 보존
      existing.exercises[idx] = {
        ...record,
        savedAt: existing.exercises[idx].savedAt ?? Date.now(),
      };
    } else {
      existing.exercises.push({ ...record, savedAt: Date.now() });
    }
  } else {
    sessions.push({
      id: genId(),
      date,
      exercises: [{ ...record, savedAt: Date.now() }],
    });
  }
  localStorage.setItem(KEY, JSON.stringify(sessions));
}

// 세션 저장 (같은 날짜가 있으면 병합: 러닝은 덮어쓰기, 운동은 추가)
export function saveSession(input: Omit<WorkoutSession, "id">): void {
  if (!isBrowser()) return;
  const sessions = getSessions();
  const existing = sessions.find((s) => s.date === input.date);
  const now = Date.now();
  // 들어온 종목에 저장 시각 부여 (저장 순서 정렬용)
  const incomingExercises = input.exercises.map((e) => ({
    ...e,
    savedAt: e.savedAt ?? now,
  }));

  if (existing) {
    if (input.running) {
      // 같은 날 러닝 재저장 시엔 원래 저장 순서를 유지하도록 savedAt 보존
      existing.running = {
        ...input.running,
        savedAt: existing.running?.savedAt ?? input.running.savedAt ?? now,
      };
    }
    existing.exercises = [...existing.exercises, ...incomingExercises];
  } else {
    sessions.push({
      id: genId(),
      date: input.date,
      running: input.running
        ? { ...input.running, savedAt: input.running.savedAt ?? now }
        : undefined,
      exercises: incomingExercises,
    });
  }
  localStorage.setItem(KEY, JSON.stringify(sessions));
}

// 특정 날짜 세션 전체 교체 (수정 화면에서 사용).
// running/exercises를 넘긴 값으로 완전히 대체한다(saveSession의 병합과 다름).
// running을 생략하면 그날 러닝 삭제, 내용이 하나도 없으면 그날 세션 자체를 삭제한다.
export function updateSession(
  date: string,
  data: { running?: RunningRecord; exercises: ExerciseRecord[] }
): void {
  if (!isBrowser()) return;
  const sessions = getSessions();
  const idx = sessions.findIndex((s) => s.date === date);
  if (idx < 0) return; // 해당 날짜 기록 없음 → 아무것도 안 함

  if (!data.running && data.exercises.length === 0) {
    // 러닝도 운동도 없으면 빈 세션을 남기지 않고 제거
    sessions.splice(idx, 1);
  } else {
    const prior = sessions[idx];
    const now = Date.now();
    // 수정 후에도 저장 순서를 유지: 러닝은 기존 savedAt, 종목은 이름으로 매칭해 기존 savedAt 보존
    const running = data.running
      ? { ...data.running, savedAt: prior.running?.savedAt ?? now }
      : undefined;
    const exercises = data.exercises.map((e) => {
      const old = prior.exercises.find((o) => o.name === e.name);
      return { ...e, savedAt: e.savedAt ?? old?.savedAt ?? now };
    });
    sessions[idx] = { ...prior, running, exercises };
  }
  localStorage.setItem(KEY, JSON.stringify(sessions));
}

// 특정 날짜 세션 삭제 (그날 기록 전체 삭제)
export function deleteSession(date: string): void {
  if (!isBrowser()) return;
  const sessions = getSessions().filter((s) => s.date !== date);
  localStorage.setItem(KEY, JSON.stringify(sessions));
}

// 마지막 운동 날짜 (기록 없으면 null)
export function getLastWorkoutDate(): string | null {
  const sessions = getSessions();
  return sessions.length > 0 ? sessions[sessions.length - 1].date : null;
}

// 특정 종목의 가장 최근 기록 (상체/하체 화면 상단 표시용)
export function getLastExerciseRecord(
  name: string
): { date: string; record: ExerciseRecord } | null {
  const sessions = getSessions();
  for (let i = sessions.length - 1; i >= 0; i--) {
    const found = sessions[i].exercises.find((e) => e.name === name);
    if (found) return { date: sessions[i].date, record: found };
  }
  return null;
}

// ── 종목 목록(카테고리별 그룹) 저장 ────────────────────────────────
// 설정 화면에서 종목을 추가/삭제하면 여기에 카테고리별로 저장됨.
// 저장된 값이 없으면 호출부가 넘긴 기본값(fallback)을 사용.

type ExerciseConfig = Partial<Record<"upper" | "lower", ExerciseGroup[]>>;

function readExerciseConfig(): ExerciseConfig {
  if (!isBrowser()) return {};
  try {
    const raw = localStorage.getItem(EXERCISE_KEY);
    return raw ? (JSON.parse(raw) as ExerciseConfig) : {};
  } catch {
    return {};
  }
}

// 카테고리의 종목 그룹 조회 (저장된 값 없으면 fallback 반환)
export function getExerciseGroups(
  category: "upper" | "lower",
  fallback: ExerciseGroup[]
): ExerciseGroup[] {
  return readExerciseConfig()[category] ?? fallback;
}

// 카테고리의 종목 그룹 저장
export function setExerciseGroups(
  category: "upper" | "lower",
  groups: ExerciseGroup[]
): void {
  if (!isBrowser()) return;
  const config = readExerciseConfig();
  config[category] = groups;
  localStorage.setItem(EXERCISE_KEY, JSON.stringify(config));
}
