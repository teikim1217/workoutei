"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getExerciseGroups,
  getLastExerciseRecord,
  saveSession,
  setExerciseGroups,
} from "@/lib/storage";
import type { ExerciseGroup, ExerciseRecord, SetRecord } from "@/lib/types";
import Button from "@/components/Button";

// 세트 입력용 (숫자 입력 중 빈 값 허용 위해 문자열로 보관)
interface SetInput {
  weight: string;
  reps: string;
}

interface WorkoutRecorderProps {
  category: "upper" | "lower";
  defaultGroups: ExerciseGroup[];
  // 기록할 날짜("YYYY-MM-DD"). 없거나 형식이 틀리면 오늘로 저장.
  date?: string;
}

// "최대" 세트: 중량 최대, 동률이면 횟수 많은 쪽
function maxSet(sets: SetRecord[]): SetRecord {
  return sets.reduce((best, s) => {
    if (s.weightKg > best.weightKg) return s;
    if (s.weightKg === best.weightKg && s.reps > best.reps) return s;
    return best;
  }, sets[0]);
}

// "YYYY-MM-DD" → "M/D"
function toMonthDay(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${m}/${d}`;
}

// 로컬 자정 기준 "YYYY-MM-DD"
function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function WorkoutRecorder({
  category,
  defaultGroups,
  date,
}: WorkoutRecorderProps) {
  const router = useRouter();
  // 기록 대상 날짜: 유효한 date prop이 있으면 그 날짜, 없으면 오늘
  const targetDate =
    date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : formatDate(new Date());
  const backHref = date ? `/start?date=${targetDate}` : "/start";
  const [selected, setSelected] = useState<string | null>(null);
  const [groups, setGroups] = useState<ExerciseGroup[]>(defaultGroups);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // 설정 모달: 그룹별 새 종목 입력값
  const [newInputs, setNewInputs] = useState<Record<string, string>>({});

  // 세트 입력 + 오늘 임시 기록 (아직 localStorage 저장 안 함)
  const [sets, setSets] = useState<SetInput[]>([]);
  const [todayRecords, setTodayRecords] = useState<ExerciseRecord[]>([]);

  // 저장된 종목 목록 로드 (없으면 기본값 유지)
  useEffect(() => {
    setGroups(getExerciseGroups(category, defaultGroups));
  }, [category, defaultGroups]);

  // 그룹 변경을 상태 + localStorage 양쪽에 반영
  function commitGroups(next: ExerciseGroup[]) {
    setGroups(next);
    setExerciseGroups(category, next);
  }

  function addExercise(groupName: string) {
    const name = (newInputs[groupName] ?? "").trim();
    if (!name) return;
    const next = groups.map((g) =>
      g.name === groupName && !g.exercises.includes(name)
        ? { ...g, exercises: [...g.exercises, name] }
        : g,
    );
    commitGroups(next);
    setNewInputs((prev) => ({ ...prev, [groupName]: "" }));
  }

  function removeExercise(groupName: string, name: string) {
    const next = groups.map((g) =>
      g.name === groupName
        ? { ...g, exercises: g.exercises.filter((e) => e !== name) }
        : g,
    );
    commitGroups(next);
    if (selected === name) setSelected(null); // 선택 중이던 종목이 삭제되면 해제
  }

  // 종목 선택 → 세트 입력 시작. 이미 오늘 기록에 있으면 그 세트를 불러와 편집
  function selectExercise(name: string) {
    setSelected(name);
    const existing = todayRecords.find((r) => r.name === name);
    setSets(
      existing
        ? existing.sets.map((s) => ({
            weight: String(s.weightKg),
            reps: String(s.reps),
          }))
        : // 새 종목은 기본 3세트로 시작 (필요 시 추가/삭제)
          [
            { weight: "", reps: "" },
            { weight: "", reps: "" },
            { weight: "", reps: "" },
          ],
    );
  }

  function updateSet(i: number, field: keyof SetInput, value: string) {
    setSets((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)),
    );
  }

  function addSetRow() {
    setSets((prev) => [...prev, { weight: "", reps: "" }]);
  }

  function removeSetRow(i: number) {
    setSets((prev) => prev.filter((_, idx) => idx !== i));
  }

  // 유효 세트(중량·횟수 모두 입력)가 하나라도 있어야 저장 가능
  const canSaveExercise = sets.some(
    (s) => s.weight.trim() !== "" && s.reps.trim() !== "",
  );

  // 현재 종목+세트를 오늘 임시 목록에 upsert 후 입력 초기화
  function saveExercise() {
    if (!selected || !canSaveExercise) return;
    const validSets: SetRecord[] = sets
      .filter((s) => s.weight.trim() !== "" && s.reps.trim() !== "")
      .map((s) => ({ weightKg: Number(s.weight), reps: Number(s.reps) }))
      .filter((s) => !Number.isNaN(s.weightKg) && !Number.isNaN(s.reps));
    if (validSets.length === 0) return;

    const record: ExerciseRecord = { name: selected, category, sets: validSets };
    setTodayRecords((prev) => {
      const idx = prev.findIndex((r) => r.name === selected);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = record; // 같은 종목이면 교체
        return copy;
      }
      return [...prev, record];
    });
    setSelected(null);
    setSets([]);
  }

  function closeSetInput() {
    setSelected(null);
    setSets([]);
  }

  // 운동 종료: 임시 목록 전체를 오늘 날짜로 저장 후 홈 이동
  function finishWorkout() {
    if (todayRecords.length === 0) return;
    // 입력 중이고 아직 "종목 저장" 안 한 유효 세트가 있으면 확인
    if (selected && canSaveExercise) {
      const ok = window.confirm("저장하지 않은 세트가 있습니다. 종료할까요?");
      if (!ok) return;
    }
    saveSession({ date: targetDate, exercises: todayRecords });
    router.push("/");
  }

  // 선택 종목의 최근 기록 (클라이언트에서만 localStorage 조회)
  const recent = selected ? getLastExerciseRecord(selected) : null;

  let recentText = "종목을 선택하세요";
  if (selected) {
    if (recent) {
      const start = recent.record.sets[0];
      const mx = maxSet(recent.record.sets);
      recentText =
        `${selected} — ${toMonthDay(recent.date)} ` +
        `(${recent.record.sets.length} sets) ` +
        `시작 ${start.weightKg}kg×${start.reps} / ` +
        `최대 ${mx.weightKg}kg×${mx.reps}`;
    } else {
      recentText = "첫 기록입니다";
    }
  }

  return (
    <main className="flex min-w-0 flex-1 flex-col px-6">
      {/* 상단 바: 뒤로가기(좌) + 설정(우) */}
      <div className="flex items-center justify-between pt-6">
        <Link
          href={backHref}
          aria-label="뒤로"
          className="inline-flex select-none items-center gap-1 text-muted active:text-body"
        >
          <span className="text-2xl leading-none">‹</span>
          <span className="text-base">뒤로</span>
        </Link>
        <button
          type="button"
          aria-label="종목 설정"
          onClick={() => setSettingsOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-muted active:bg-surface-elevated"
        >
          ⚙︎
        </button>
      </div>

      <h1 className="mt-4 text-2xl font-bold text-on-dark">
        {category === "upper" ? "상체 운동" : "하체 운동"}
      </h1>
      {/* 선택한 날짜로 기록 중임을 표시 (오늘이 아닌 날짜 기록 시) */}
      {date && (
        <p className="mt-1 text-xs tracking-wide text-muted">
          {toMonthDay(targetDate)} 기록 추가 중
        </p>
      )}

      {/* 최근 기록 표시 영역 */}
      <div className="mt-4 min-h-16 border border-hairline bg-surface-card px-5 py-4">
        <p className="text-sm leading-relaxed text-body">{recentText}</p>
      </div>

      {/* 오늘 기록 (임시 목록) */}
      {todayRecords.length > 0 && (
        <p className="mt-3 text-sm leading-relaxed text-body">
          <span className="font-bold text-on-dark">오늘 기록: </span>
          {todayRecords.map((r) => `${r.name} ${r.sets.length}세트`).join(", ")}
        </p>
      )}

      {/* 하위 카테고리별 종목 버튼 그리드 (2열). 그룹이 하나면 헤더 생략 */}
      {groups.map((g) => (
        <div key={g.name} className="mt-6">
          {groups.length > 1 && (
            <h2 className="mb-2 text-sm tracking-wide text-muted">{g.name}</h2>
          )}
          <div className="grid grid-cols-2 gap-3">
            {g.exercises.map((name) => {
              const active = selected === name;
              const recorded = todayRecords.some((r) => r.name === name);
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => selectExercise(name)}
                  className={`relative flex min-h-16 min-w-0 select-none items-center justify-center px-3 text-center text-sm font-bold uppercase tracking-wide ${
                    active
                      ? "bg-white text-black"
                      : "border border-hairline bg-transparent text-body"
                  }`}
                >
                  {/* 오늘 기록에 담긴 종목 체크 표시 */}
                  {recorded && (
                    <span
                      className={`absolute right-2 top-2 text-sm ${
                        active ? "text-black" : "text-on-dark"
                      }`}
                    >
                      ✓
                    </span>
                  )}
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* 운동 종료: 임시 목록 전체를 오늘 날짜로 저장 */}
      <Button
        variant="solid"
        onClick={finishWorkout}
        disabled={todayRecords.length === 0}
        className="mt-8"
      >
        운동 종료
      </Button>

      {/* 세트 입력 시트가 하단을 가리지 않도록 여백 확보 */}
      <div className={selected ? "h-96" : "h-8"} />

      {/* 세트 입력 시트 (종목 선택 시 하단 고정) */}
      {selected && (
        <div className="pb-safe-button fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-surface-elevated px-6 pt-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-lg font-bold uppercase tracking-wide text-on-dark">
              {selected}
            </span>
            <button
              type="button"
              aria-label="닫기"
              onClick={closeSetInput}
              className="text-xl text-muted active:text-body"
            >
              ✕
            </button>
          </div>

          {/* 세트 행들 */}
          <div className="flex max-h-52 flex-col gap-2 overflow-y-auto">
            {sets.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-6 shrink-0 text-sm text-muted">{i + 1}</span>
                <input
                  inputMode="decimal"
                  value={s.weight}
                  onChange={(e) => updateSet(i, "weight", e.target.value)}
                  placeholder="kg"
                  className="h-12 min-w-0 flex-1 rounded-none border border-hairline bg-surface-card px-3 text-center text-base font-bold text-on-dark outline-none focus:border-white"
                />
                <span className="shrink-0 text-sm text-muted">kg</span>
                <input
                  inputMode="numeric"
                  value={s.reps}
                  onChange={(e) => updateSet(i, "reps", e.target.value)}
                  placeholder="회"
                  className="h-12 min-w-0 flex-1 rounded-none border border-hairline bg-surface-card px-3 text-center text-base font-bold text-on-dark outline-none focus:border-white"
                />
                <span className="shrink-0 text-sm text-muted">회</span>
                <button
                  type="button"
                  aria-label={`${i + 1}세트 삭제`}
                  onClick={() => removeSetRow(i)}
                  className="shrink-0 px-1 text-lg text-muted active:text-body"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addSetRow}
            className="mt-2 w-full rounded-none border border-dashed border-hairline py-2 text-sm text-muted active:bg-surface-card"
          >
            + 세트 추가
          </button>

          <Button
            variant="solid"
            onClick={saveExercise}
            disabled={!canSaveExercise}
            className="mt-3"
          >
            종목 저장
          </Button>
        </div>
      )}

      {/* 설정 모달: 종목 추가/삭제 */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/60">
          <button
            type="button"
            aria-label="닫기"
            className="flex-1"
            onClick={() => setSettingsOpen(false)}
          />
          <div className="pb-safe-button max-h-[80vh] overflow-y-auto border-t border-hairline bg-surface-elevated px-6 pt-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-on-dark">종목 설정</h2>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="text-base font-bold text-on-dark active:text-body"
              >
                완료
              </button>
            </div>

            {groups.map((g) => (
              <div key={g.name} className="mb-6">
                <h3 className="mb-2 text-sm tracking-wide text-muted">
                  {g.name}
                </h3>
                <div className="flex flex-col gap-2">
                  {g.exercises.map((name) => (
                    <div
                      key={name}
                      className="flex items-center justify-between border border-hairline px-4 py-3"
                    >
                      <span className="min-w-0 truncate text-base uppercase tracking-wide text-body">
                        {name}
                      </span>
                      <button
                        type="button"
                        aria-label={`${name} 삭제`}
                        onClick={() => removeExercise(g.name, name)}
                        className="ml-3 shrink-0 text-lg text-muted active:text-body"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {g.exercises.length === 0 && (
                    <p className="px-1 text-sm text-muted">종목 없음</p>
                  )}
                </div>

                {/* 새 종목 추가 */}
                <div className="mt-2 flex gap-2">
                  <input
                    value={newInputs[g.name] ?? ""}
                    onChange={(e) =>
                      setNewInputs((prev) => ({
                        ...prev,
                        [g.name]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addExercise(g.name);
                    }}
                    placeholder="새 종목 추가"
                    className="h-11 min-w-0 flex-1 rounded-none border border-hairline bg-surface-card px-3 text-base text-on-dark outline-none focus:border-white"
                  />
                  <button
                    type="button"
                    onClick={() => addExercise(g.name)}
                    className="h-11 shrink-0 rounded-none bg-white px-4 text-base font-bold text-black active:bg-white/90"
                  >
                    추가
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
