"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getSessionByDate,
  updateSession,
  deleteSession,
} from "@/lib/storage";
import Button from "@/components/Button";
import type { RunningRecord, ExerciseRecord } from "@/lib/types";

// 편집 중에는 빈 값 허용을 위해 숫자를 문자열로 보관
interface SetInput {
  weight: string;
  reps: string;
}
interface ExerciseEdit {
  name: string;
  category: "upper" | "lower";
  sets: SetInput[];
}
interface RunningEdit {
  distanceKm: string;
  durationMin: string;
  type: "indoor" | "outdoor";
}

// "YYYY-MM-DD" → "M월 D일"
function toKoreanDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${m}월 ${d}일`;
}

export default function EditPage() {
  const router = useRouter();
  const params = useParams<{ date: string }>();
  const date = params.date;

  const [loaded, setLoaded] = useState(false);
  const [exists, setExists] = useState(false);
  const [running, setRunning] = useState<RunningEdit | null>(null);
  const [exercises, setExercises] = useState<ExerciseEdit[]>([]);

  // 해당 날짜 세션을 편집 상태로 로드 (localStorage → 클라에서만)
  useEffect(() => {
    const session = getSessionByDate(date);
    if (session) {
      setExists(true);
      setRunning(
        session.running
          ? {
              distanceKm: String(session.running.distanceKm),
              durationMin: String(session.running.durationMin),
              type: session.running.type,
            }
          : null,
      );
      setExercises(
        session.exercises.map((e) => ({
          name: e.name,
          category: e.category,
          sets: e.sets.map((s) => ({
            weight: String(s.weightKg),
            reps: String(s.reps),
          })),
        })),
      );
    }
    setLoaded(true);
  }, [date]);

  // ── 러닝 편집 ─────────────────────────────
  function updateRunning(field: keyof RunningEdit, value: string) {
    setRunning((prev) => (prev ? { ...prev, [field]: value } : prev));
  }
  function addRunning() {
    setRunning({ distanceKm: "", durationMin: "", type: "outdoor" });
  }
  function removeRunning() {
    setRunning(null);
  }

  // ── 종목/세트 편집 ─────────────────────────
  function updateSet(ei: number, si: number, field: keyof SetInput, value: string) {
    setExercises((prev) =>
      prev.map((e, i) =>
        i === ei
          ? {
              ...e,
              sets: e.sets.map((s, j) =>
                j === si ? { ...s, [field]: value } : s,
              ),
            }
          : e,
      ),
    );
  }
  function addSet(ei: number) {
    setExercises((prev) =>
      prev.map((e, i) =>
        i === ei ? { ...e, sets: [...e.sets, { weight: "", reps: "" }] } : e,
      ),
    );
  }
  function removeSet(ei: number, si: number) {
    setExercises((prev) =>
      prev.map((e, i) =>
        i === ei ? { ...e, sets: e.sets.filter((_, j) => j !== si) } : e,
      ),
    );
  }
  function removeExercise(ei: number) {
    setExercises((prev) => prev.filter((_, i) => i !== ei));
  }

  // ── 저장 / 삭제 ───────────────────────────
  function handleSave() {
    // 유효 세트(중량·횟수 모두 입력)만 남기고, 세트가 하나도 없는 종목은 제외
    const builtExercises: ExerciseRecord[] = exercises
      .map((e) => ({
        name: e.name,
        category: e.category,
        sets: e.sets
          .filter((s) => s.weight.trim() !== "" && s.reps.trim() !== "")
          .map((s) => ({ weightKg: Number(s.weight), reps: Number(s.reps) }))
          .filter((s) => !Number.isNaN(s.weightKg) && !Number.isNaN(s.reps)),
      }))
      .filter((e) => e.sets.length > 0);

    // 러닝: 거리·시간 모두 유효할 때만 저장, 아니면 삭제(undefined)
    let builtRunning: RunningRecord | undefined;
    if (running) {
      const dist = Number(running.distanceKm);
      const dur = Number(running.durationMin);
      if (
        running.distanceKm.trim() !== "" &&
        running.durationMin.trim() !== "" &&
        !Number.isNaN(dist) &&
        !Number.isNaN(dur)
      ) {
        builtRunning = { distanceKm: dist, durationMin: dur, type: running.type };
      }
    }

    // updateSession: 러닝·운동 모두 비면 그날 세션을 자동 삭제
    updateSession(date, { running: builtRunning, exercises: builtExercises });
    router.push("/");
  }

  function handleDeleteAll() {
    if (!window.confirm(`${toKoreanDate(date)} 기록을 모두 삭제할까요?`)) return;
    deleteSession(date);
    router.push("/");
  }

  // 로드 전 / 기록 없는 날짜 처리
  if (!loaded) {
    return <main className="flex min-w-0 flex-1 flex-col px-6 pt-10" />;
  }
  if (!exists) {
    return (
      <main className="flex min-w-0 flex-1 flex-col px-6 pt-10">
        <p className="text-lg text-body">
          {toKoreanDate(date)}에 기록이 없습니다.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-12 select-none items-center justify-center border border-white px-6 text-base font-bold text-white active:bg-white/10"
        >
          홈으로
        </Link>
      </main>
    );
  }

  return (
    <main className="flex min-w-0 flex-1 flex-col px-6 pb-8">
      {/* 상단 바 */}
      <div className="flex items-center justify-between pt-6">
        <Link
          href="/"
          aria-label="뒤로"
          className="inline-flex select-none items-center gap-1 text-muted active:text-body"
        >
          <span className="text-2xl leading-none">‹</span>
          <span className="text-base">뒤로</span>
        </Link>
      </div>

      <h1 className="mt-4 text-2xl font-bold text-on-dark">
        {toKoreanDate(date)} 수정
      </h1>

      {/* 러닝 편집 */}
      <section className="mt-6">
        <h2 className="mb-2 text-sm tracking-wide text-muted">러닝</h2>
        {running ? (
          <div className="border border-hairline p-4">
            <div className="flex items-center gap-2">
              <input
                inputMode="decimal"
                value={running.distanceKm}
                onChange={(e) => updateRunning("distanceKm", e.target.value)}
                placeholder="거리"
                className="h-12 min-w-0 flex-1 rounded-none border border-hairline bg-surface-card px-3 text-center text-base font-bold text-on-dark outline-none focus:border-white"
              />
              <span className="shrink-0 text-sm text-muted">km</span>
              <input
                inputMode="numeric"
                value={running.durationMin}
                onChange={(e) => updateRunning("durationMin", e.target.value)}
                placeholder="시간"
                className="h-12 min-w-0 flex-1 rounded-none border border-hairline bg-surface-card px-3 text-center text-base font-bold text-on-dark outline-none focus:border-white"
              />
              <span className="shrink-0 text-sm text-muted">분</span>
            </div>
            <div className="mt-3 flex gap-2">
              {(["indoor", "outdoor"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => updateRunning("type", t)}
                  className={`h-11 flex-1 text-base font-bold ${
                    running.type === t
                      ? "bg-white text-black"
                      : "border border-hairline bg-transparent text-body"
                  }`}
                >
                  {t === "indoor" ? "실내" : "실외"}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={removeRunning}
              className="mt-3 w-full py-2 text-sm text-muted active:text-body"
            >
              러닝 삭제
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={addRunning}
            className="w-full rounded-none border border-dashed border-hairline py-3 text-sm text-muted active:bg-surface-card"
          >
            + 러닝 추가
          </button>
        )}
      </section>

      {/* 종목 편집 */}
      <section className="mt-6">
        <h2 className="mb-2 text-sm tracking-wide text-muted">운동</h2>
        {exercises.length === 0 && (
          <p className="px-1 text-sm text-muted">종목 없음</p>
        )}
        <div className="flex flex-col gap-4">
          {exercises.map((ex, ei) => (
            <div key={ei} className="border border-hairline p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="min-w-0 truncate text-lg font-bold uppercase tracking-wide text-on-dark">
                  {ex.name}
                </span>
                <button
                  type="button"
                  onClick={() => removeExercise(ei)}
                  className="ml-3 shrink-0 text-sm text-muted active:text-body"
                >
                  종목 삭제
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {ex.sets.map((s, si) => (
                  <div key={si} className="flex items-center gap-2">
                    <span className="w-6 shrink-0 text-sm text-muted">
                      {si + 1}
                    </span>
                    <input
                      inputMode="decimal"
                      value={s.weight}
                      onChange={(e) => updateSet(ei, si, "weight", e.target.value)}
                      placeholder="kg"
                      className="h-12 min-w-0 flex-1 rounded-none border border-hairline bg-surface-card px-3 text-center text-base font-bold text-on-dark outline-none focus:border-white"
                    />
                    <span className="shrink-0 text-sm text-muted">kg</span>
                    <input
                      inputMode="numeric"
                      value={s.reps}
                      onChange={(e) => updateSet(ei, si, "reps", e.target.value)}
                      placeholder="회"
                      className="h-12 min-w-0 flex-1 rounded-none border border-hairline bg-surface-card px-3 text-center text-base font-bold text-on-dark outline-none focus:border-white"
                    />
                    <span className="shrink-0 text-sm text-muted">회</span>
                    <button
                      type="button"
                      aria-label={`${si + 1}세트 삭제`}
                      onClick={() => removeSet(ei, si)}
                      className="shrink-0 px-1 text-lg text-muted active:text-body"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => addSet(ei)}
                className="mt-2 w-full rounded-none border border-dashed border-hairline py-2 text-sm text-muted active:bg-surface-card"
              >
                + 세트 추가
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 저장 / 전체 삭제 */}
      <Button variant="solid" onClick={handleSave} className="mt-8">
        저장
      </Button>
      <button
        type="button"
        onClick={handleDeleteAll}
        className="mt-3 h-12 w-full select-none border border-hairline text-base font-bold text-body active:bg-surface-elevated"
      >
        이 날 기록 전체 삭제
      </button>
    </main>
  );
}
