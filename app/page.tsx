"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  getLastWorkoutDate,
  getSessionByDate,
  getSessions,
} from "@/lib/storage";
import type { SetRecord } from "@/lib/types";
import { formatPace } from "@/lib/pace";
import { orderedItems } from "@/lib/stats";
import DayBadge from "@/components/DayBadge";
import IgnitionStartButton from "@/components/IgnitionStartButton";

// 로컬 자정 기준 "YYYY-MM-DD" 포맷 (UTC 아님)
function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// "YYYY-MM-DD" 문자열을 로컬 자정 기준 Date로 파싱
function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// 두 날짜(YYYY-MM-DD) 사이의 경과 일수
function daysBetween(from: string, to: string): number {
  const ms = parseDate(to).getTime() - parseDate(from).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// "최대" 세트: 중량 최대, 동률이면 횟수 많은 쪽
function maxSet(sets: SetRecord[]): SetRecord {
  return sets.reduce((best, s) => {
    if (s.weightKg > best.weightKg) return s;
    if (s.weightKg === best.weightKg && s.reps > best.reps) return s;
    return best;
  }, sets[0]);
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [monthCount, setMonthCount] = useState(0);

  // 달력 상태 — 오늘/보기월은 lazy 초기화(서버·클라 동일 TZ → 값 일치, 하이드레이션 안전).
  // 달력을 SSR에서 바로 렌더해 아이폰에서 JS 지연/실패해도 달력이 보이게 함.
  const [today] = useState(() => formatDate(new Date()));
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth()); // 0-based
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  // 날짜별 운동 종류 (배지 계산용). 초기 빈 Map이 SSR과 일치 → 마운트 후 채움
  const [workoutInfo, setWorkoutInfo] = useState<
    Map<string, { hasRunning: boolean; hasUpper: boolean; hasLower: boolean }>
  >(new Map());

  // 저장소 데이터 로딩 (마운트 시).
  // 점(dot)/상태문구/카운트는 localStorage 의존이라 클라에서만 채움 (초기 빈 값이 SSR과 일치).
  useEffect(() => {
    const todayStr = formatDate(new Date());
    const sessions = getSessions();

    setMounted(true);
    const info = new Map<
      string,
      { hasRunning: boolean; hasUpper: boolean; hasLower: boolean }
    >();
    for (const s of sessions) {
      info.set(s.date, {
        hasRunning: !!s.running,
        hasUpper: s.exercises.some((e) => e.category === "upper"),
        hasLower: s.exercises.some((e) => e.category === "lower"),
      });
    }
    setWorkoutInfo(info);

    const lastDate = getLastWorkoutDate();
    if (!lastDate) {
      setStatusText("첫 운동을 시작해보세요!");
    } else if (lastDate === todayStr) {
      setStatusText("오늘 운동 완료!");
    } else {
      setStatusText(`마지막 운동 후 ${daysBetween(lastDate, todayStr)}일차`);
    }

    // 최근 30일(0~29일 이내) 운동한 날 수
    const count = sessions.filter((s) => {
      const diff = daysBetween(s.date, todayStr);
      return diff >= 0 && diff < 30;
    }).length;
    setMonthCount(count);
  }, []);

  // 이전/다음 달 이동
  function changeMonth(delta: number) {
    let y = viewYear;
    let m = viewMonth + delta;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewYear(y);
    setViewMonth(m);
  }

  // 달력 좌우 스와이프로 월 이동 (물리 버튼과 병행)
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  function onCalTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }
  function onCalTouchEnd(e: React.TouchEvent) {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;
    const THRESHOLD = 40;
    // 가로 이동이 세로보다 크고 임계값 넘을 때만
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > THRESHOLD) {
      changeMonth(dx < 0 ? 1 : -1); // 왼쪽 스와이프→다음 달, 오른쪽→이전 달
    }
  }

  // 달력 셀 계산
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay(); // 0=일
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  // "마지막 운동 후 N일차"에서 N만 추출 (거대 숫자 스펙셀용). 그 외 문구는 그대로 표시
  const dayMatch = mounted
    ? statusText.match(/^마지막 운동 후 (\d+)일차$/)
    : null;

  return (
    <main className="flex flex-1 flex-col px-6">
      {/* 상단 바: 통계 버튼(우측). M 스트라이프는 layout.tsx에서 전역 고정 렌더 */}
      <div className="flex justify-end pb-4 pt-4">
        <Link
          href="/stats"
          aria-label="통계"
          className="inline-flex h-10 select-none items-center gap-1 border border-hairline px-4 text-xs tracking-wide text-body active:bg-surface-elevated"
        >
          📊 통계
        </Link>
      </div>

      {/* 구분선 (풀블리드) */}
      <div className="-mx-6 border-t border-hairline" />

      {/* 상단 상태 영역 (spec-cell: 라벨 / 거대 숫자 / 라벨) */}
      <section className="py-8 text-center">
        {mounted && dayMatch ? (
          <div>
            <p className="text-xs tracking-[0.15em] text-muted">마지막 운동 후</p>
            <p className="mt-1 text-[72px] font-bold leading-none tabular-nums text-on-dark">
              {dayMatch[1]}
            </p>
            <p className="mt-1 text-xs tracking-[0.15em] text-muted">일차</p>
          </div>
        ) : (
          <p className="text-2xl font-bold text-on-dark">
            {mounted ? statusText : " "}
          </p>
        )}
        <p className="mt-4 text-xs tracking-wide text-muted">
          {mounted ? `최근 30일간 운동 ${monthCount}일` : " "}
        </p>
      </section>

      {/* 구분선 (풀블리드) */}
      <div className="-mx-6 border-t border-hairline" />

      {/* 월 달력 (배경 --canvas, SSR 렌더) */}
      <section
        onTouchStart={onCalTouchStart}
        onTouchEnd={onCalTouchEnd}
        className="pt-6"
      >
        {/* 헤더: 연월 + 이전/다음 이동 */}
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={() => changeMonth(-1)}
            aria-label="이전 달"
            className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-muted active:bg-surface-elevated"
          >
            ‹
          </button>
          <span className="text-lg font-bold text-on-dark">
            {viewYear}년 {viewMonth + 1}월
          </span>
          <button
            onClick={() => changeMonth(1)}
            aria-label="다음 달"
            className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-muted active:bg-surface-elevated"
          >
            ›
          </button>
        </div>

        {/* 요일 헤더 (상하 hairline으로 프레이밍) */}
        <div className="grid grid-cols-7 border-y border-hairline py-2 text-center text-sm text-muted">
          {WEEKDAYS.map((w) => (
            <div key={w}>{w}</div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="mt-2 grid grid-cols-7">
          {cells.map((d, i) => {
            if (d === null) return <div key={`e${i}`} className="h-12" />;
            const dateStr = formatDate(new Date(viewYear, viewMonth, d));
            const isToday = dateStr === today;
            const isSelected = dateStr === selectedDate;
            const info = workoutInfo.get(dateStr);
            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className="relative flex h-12 items-center justify-center text-base font-bold tabular-nums text-on-dark"
              >
                {/* 운동 기록 배지 (BMW 로고 스타일, 숫자 뒤) */}
                {info && (
                  <DayBadge
                    hasRunning={info.hasRunning}
                    hasUpper={info.hasUpper}
                    hasLower={info.hasLower}
                  />
                )}
                {/* 선택=흰 링 / 오늘=muted 링 (원형, 배지를 가리지 않음) */}
                {isSelected ? (
                  <span className="pointer-events-none absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white" />
                ) : isToday ? (
                  <span className="pointer-events-none absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border border-muted" />
                ) : null}
                {/* 날짜 숫자 (맨 위, 흰색 700) */}
                <span className="relative z-10">{d}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 선택한 날짜 요약 카드 */}
      {mounted &&
        selectedDate &&
        (() => {
          const session = getSessionByDate(selectedDate);
          const d = parseDate(selectedDate);
          return (
            <section className="mt-4 border border-hairline bg-surface-card p-6">
              <p className="text-lg font-bold text-on-dark">
                {d.getMonth() + 1}월 {d.getDate()}일
              </p>

              {!session && (
                <p className="mt-4 text-sm font-light text-body">
                  기록이 없습니다
                </p>
              )}

              {/* 러닝·종목을 저장한 순서대로 표시 */}
              {session &&
                orderedItems(session).map((it, i) => {
                  if (it.kind === "running") {
                    const r = it.running;
                    const p = formatPace(r.distanceKm, r.durationMin);
                    return (
                      <p
                        key={`r-${i}`}
                        className="mt-4 text-sm font-light text-body"
                      >
                        러닝 {r.distanceKm}km ({r.durationMin}min)
                        {p ? ` · 페이스 ${p}/km` : ""}
                      </p>
                    );
                  }
                  const ex = it.exercise;
                  if (ex.sets.length === 0) return null;
                  const start = ex.sets[0];
                  const mx = maxSet(ex.sets);
                  return (
                    <div key={`e-${i}`} className="mt-4">
                      <p className="text-sm font-bold uppercase tracking-[0.1em] text-on-dark">
                        {ex.name}
                      </p>
                      <p className="mt-1 text-sm font-light text-body">
                        {ex.sets.length} sets · 시작 {start.weightKg}kg{" "}
                        {start.reps}회 · 최대 {mx.weightKg}kg {mx.reps}회
                      </p>
                    </div>
                  );
                })}

              {/* 액션: 수정(기록 있을 때) + 운동 추가(항상, 선택 날짜로 저장) */}
              <div className="mt-6 flex flex-wrap gap-2">
                {session && (
                  <Link
                    href={`/edit/${selectedDate}`}
                    className="inline-flex h-10 select-none items-center border border-hairline px-4 text-xs tracking-wide text-body active:bg-surface-elevated"
                  >
                    수정
                  </Link>
                )}
                <Link
                  href={`/start?date=${selectedDate}`}
                  className="inline-flex h-10 select-none items-center border border-white px-4 text-xs tracking-wide text-on-dark active:bg-white/10"
                >
                  {session ? "운동 추가" : "이 날짜에 운동 추가"}
                </Link>
              </div>
            </section>
          );
        })()}

      {/* 남은 공간 (버튼을 하단으로 밀어냄) */}
      <div className="flex-1" />

      {/* 하단 고정 영역 (Safe Area: 홈 인디케이터 위로 띄움) + 상단 hairline */}
      <div className="pb-safe-button sticky bottom-0 -mx-6 border-t border-hairline bg-canvas px-6 pt-4">
        {/* 달력에서 날짜를 선택했으면 그 날짜로 기록하도록 전달 (없으면 오늘) */}
        <IgnitionStartButton
          href={selectedDate ? `/start?date=${selectedDate}` : "/start"}
        >
          운동시작하기
        </IgnitionStartButton>
      </div>
    </main>
  );
}
