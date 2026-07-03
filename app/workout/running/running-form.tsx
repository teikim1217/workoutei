"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import WheelPicker from "@/components/WheelPicker";
import Button from "@/components/Button";
import { saveSession } from "@/lib/storage";
import { formatPace } from "@/lib/pace";

// 로컬 자정 기준 "YYYY-MM-DD"
function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// 휠 값 목록
const WHOLE_KM = Array.from({ length: 43 }, (_, i) => i); // 0~42
const DEC_KM = Array.from({ length: 10 }, (_, i) => i); // 0~9 (0.1 단위)
const MINUTES = Array.from({ length: 241 }, (_, i) => i); // 0~240

export default function RunningForm({ initialDate }: { initialDate?: string }) {
  const router = useRouter();

  const [whole, setWhole] = useState(2); // 거리 정수부 (기본 2km)
  const [dec, setDec] = useState(0); // 거리 소수부(0.1 단위)
  const [minutes, setMinutes] = useState(10); // 시간(분) (기본 10분)
  const [type, setType] = useState<"indoor" | "outdoor">("indoor");
  // 날짜 기본값: 넘겨받은 날짜(YYYY-MM-DD)가 유효하면 그 날짜, 없으면 오늘
  const [date, setDate] = useState(() =>
    initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate)
      ? initialDate
      : formatDate(new Date()),
  );

  const distanceKm = useMemo(() => (whole * 10 + dec) / 10, [whole, dec]);
  const pace = formatPace(distanceKm, minutes);
  const canSave = distanceKm > 0 && minutes > 0;

  function handleSave() {
    if (!canSave) return;
    saveSession({
      date,
      running: { distanceKm, durationMin: minutes, type },
      exercises: [],
    });
    // 같은 날짜로 상체/하체도 이어 기록할 수 있게 날짜를 유지한 채 선택 화면으로
    router.push(`/start?date=${date}`);
  }

  return (
    <main className="flex flex-1 flex-col px-6">
      {/* 상단: 뒤로가기 (날짜 유지) */}
      <div className="pt-6">
        <Link
          href={`/start?date=${date}`}
          aria-label="뒤로"
          className="inline-flex select-none items-center gap-1 text-muted active:text-body"
        >
          <span className="text-2xl leading-none">‹</span>
          <span className="text-base">뒤로</span>
        </Link>
      </div>

      <h1 className="mt-6 text-2xl font-bold text-on-dark">러닝 기록</h1>

      {/* 거리 / 시간 휠 */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        {/* 거리 */}
        <div className="flex flex-col items-center gap-2 border border-hairline bg-surface-card p-3">
          <span className="text-xs tracking-wide text-muted">거리 (km)</span>
          <div className="flex items-center gap-1">
            <WheelPicker values={WHOLE_KM} value={whole} onChange={setWhole} />
            <span className="text-2xl font-bold text-muted">.</span>
            <WheelPicker values={DEC_KM} value={dec} onChange={setDec} />
            <span className="ml-1 text-xs text-muted">km</span>
          </div>
        </div>

        {/* 시간 */}
        <div className="flex flex-col items-center gap-2 border border-hairline bg-surface-card p-3">
          <span className="text-xs tracking-wide text-muted">시간 (분)</span>
          <div className="flex items-center gap-1">
            <WheelPicker
              values={MINUTES}
              value={minutes}
              onChange={setMinutes}
            />
            <span className="ml-1 text-xs text-muted">분</span>
          </div>
        </div>
      </div>

      {/* 페이스 (자동 계산) */}
      <div className="mt-4 flex items-center justify-between border border-hairline bg-surface-card px-5 py-4">
        <span className="text-xs tracking-wide text-muted">페이스</span>
        <span className="text-lg font-bold tabular-nums text-on-dark">
          {pace ? `${pace} /km` : "-"}
        </span>
      </div>

      {/* 실내/실외 토글 */}
      <div className="mt-6 flex flex-col gap-2">
        <span className="text-xs tracking-wide text-muted">장소</span>
        <div className="grid grid-cols-2 gap-3">
          {(["outdoor", "indoor"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`h-14 text-lg font-bold ${
                type === t
                  ? "bg-white text-black"
                  : "border border-hairline bg-transparent text-body"
              }`}
            >
              {t === "outdoor" ? "실외" : "실내"}
            </button>
          ))}
        </div>
      </div>

      {/* 날짜 */}
      <label className="mt-6 flex flex-col gap-2">
        <span className="text-xs tracking-wide text-muted">날짜</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-12 border border-hairline bg-surface-card px-4 text-on-dark outline-none focus:border-white"
        />
      </label>

      <div className="flex-1" />

      {/* 하단 저장 버튼 (Safe Area) */}
      <div className="pb-safe-button sticky bottom-0 bg-canvas pt-4">
        <Button variant="solid" onClick={handleSave} disabled={!canSave}>
          저장
        </Button>
      </div>
    </main>
  );
}
