"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSessions } from "@/lib/storage";
import { formatPace } from "@/lib/pace";
import { maxSet, getExerciseNames, getExerciseMaxSeries } from "@/lib/stats";
import type { WorkoutSession } from "@/lib/types";

// "YYYY-MM-DD" → "M월 D일"
function toKoreanDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${m}월 ${d}일`;
}
// "YYYY-MM-DD" → "M/D"
function toMonthDay(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${m}/${d}`;
}
// 오늘 기준 3개월 전 날짜 "YYYY-MM-DD"
function cutoff3Months(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const BAR_MAX_PX = 120; // 막대 최대 높이

export default function StatsPage() {
  const [loaded, setLoaded] = useState(false);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [openExercise, setOpenExercise] = useState<string | null>(null);

  // localStorage는 클라에서만 → 마운트 후 로드
  useEffect(() => {
    setSessions(getSessions());
    setLoaded(true);
  }, []);

  if (!loaded) {
    return <main className="flex min-w-0 flex-1 flex-col px-6 pt-10" />;
  }

  const names = getExerciseNames(sessions);
  const cutoff = cutoff3Months();
  // getSessions는 날짜 오름차순 → 최신순으로 뒤집어 목록 표시
  const historyDesc = [...sessions].reverse();

  return (
    <main className="flex min-w-0 flex-1 flex-col px-6 pb-10">
      {/* 상단 바 */}
      <div className="pt-6">
        <Link
          href="/"
          aria-label="홈으로"
          className="inline-flex select-none items-center gap-1 text-muted active:text-body"
        >
          <span className="text-2xl leading-none">‹</span>
          <span className="text-base">홈</span>
        </Link>
      </div>

      <h1 className="mt-4 text-2xl font-bold text-on-dark">통계</h1>

      {sessions.length === 0 ? (
        <p className="mt-8 text-base text-muted">아직 운동 기록이 없습니다.</p>
      ) : (
        <>
          {/* 종목별 최고 중량 추이 (종목 클릭 → 인라인 막대그래프) */}
          {names.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-2 text-sm tracking-wide text-muted">
                종목별 최고 중량 추이
              </h2>
              <div className="flex flex-col gap-2">
                {names.map((name) => {
                  const open = openExercise === name;
                  const series = open
                    ? getExerciseMaxSeries(sessions, name, cutoff)
                    : [];
                  const maxW = series.reduce(
                    (m, p) => Math.max(m, p.weightKg),
                    0,
                  );
                  return (
                    <div key={name} className="border border-hairline">
                      <button
                        type="button"
                        onClick={() => setOpenExercise(open ? null : name)}
                        className="flex w-full select-none items-center justify-between px-4 py-3 text-left active:bg-surface-elevated"
                      >
                        <span className="min-w-0 truncate text-base font-bold uppercase tracking-wide text-on-dark">
                          {name}
                        </span>
                        <span className="ml-3 shrink-0 text-sm text-muted">
                          {open ? "▲" : "▼"}
                        </span>
                      </button>

                      {open && (
                        <div className="border-t border-hairline px-4 py-4">
                          {series.length === 0 ? (
                            <p className="text-sm text-muted">
                              최근 3개월 기록이 없습니다.
                            </p>
                          ) : (
                            <>
                              <p className="mb-3 text-xs tracking-wide text-muted">
                                최근 3개월 최고 중량 (kg)
                              </p>
                              <div className="flex items-end gap-3 overflow-x-auto pb-1">
                                {series.map((p) => {
                                  const h =
                                    maxW > 0
                                      ? Math.round(
                                          (p.weightKg / maxW) * BAR_MAX_PX,
                                        )
                                      : 0;
                                  return (
                                    <div
                                      key={p.date}
                                      className="flex shrink-0 flex-col items-center gap-1"
                                    >
                                      <span className="text-xs font-bold tabular-nums text-on-dark">
                                        {p.weightKg}
                                      </span>
                                      <div
                                        className="w-7 bg-white"
                                        style={{ height: `${Math.max(h, 4)}px` }}
                                      />
                                      <span className="text-[10px] tabular-nums text-muted">
                                        {toMonthDay(p.date)}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 전체 기록 목록 (최신순) */}
          <section className="mt-8">
            <h2 className="mb-2 text-sm tracking-wide text-muted">기록</h2>
            <div className="flex flex-col gap-3">
              {historyDesc.map((s) => {
                const pace = s.running
                  ? formatPace(s.running.distanceKm, s.running.durationMin)
                  : null;
                return (
                  <div
                    key={s.id}
                    className="border border-hairline bg-surface-card p-4"
                  >
                    <p className="font-bold text-on-dark">
                      {toKoreanDate(s.date)}
                    </p>
                    {s.running && (
                      <p className="mt-1 text-sm font-light text-body">
                        러닝 {s.running.distanceKm}km · {s.running.durationMin}분
                        {pace ? ` · ${pace}/km` : ""} ·{" "}
                        {s.running.type === "indoor" ? "실내" : "실외"}
                      </p>
                    )}
                    {s.exercises.map((e, i) => {
                      if (e.sets.length === 0) return null;
                      const start = e.sets[0];
                      const mx = maxSet(e.sets);
                      return (
                        <p key={i} className="mt-1 text-sm font-light text-body">
                          {e.name} · {e.sets.length}세트 · 시작 {start.weightKg}
                          kg×{start.reps} / 최대 {mx.weightKg}kg×{mx.reps}
                        </p>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
