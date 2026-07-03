"use client";

import { useEffect, useRef } from "react";

// 외부 라이브러리 없이 scroll-snap으로 구현한 세로 롤(휠) 피커
// 가운데 칸에 오는 값이 선택값

const ITEM_H = 40; // 각 항목 높이(px)
const PAD = 2; // 위/아래 여백 항목 수 (보이는 항목 5칸: 위2 + 가운데1 + 아래2)

interface WheelPickerProps {
  values: number[];
  value: number;
  onChange: (v: number) => void;
}

export default function WheelPicker({
  values,
  value,
  onChange,
}: WheelPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const timeout = useRef<number | undefined>(undefined);

  const index = Math.max(0, values.indexOf(value));

  // 선택값이 바뀌면 스크롤 위치를 맞춤 (이미 근처면 건드리지 않음 → 사용자 스크롤과 충돌 방지)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target = index * ITEM_H;
    if (Math.abs(el.scrollTop - target) > 1) {
      el.scrollTop = target;
    }
  }, [index]);

  function handleScroll() {
    const el = ref.current;
    if (!el) return;
    window.clearTimeout(timeout.current);
    // 스크롤이 멈춘 뒤(스냅 완료) 가운데 항목 계산
    timeout.current = window.setTimeout(() => {
      const i = Math.round(el.scrollTop / ITEM_H);
      const clamped = Math.min(values.length - 1, Math.max(0, i));
      if (values[clamped] !== value) onChange(values[clamped]);
    }, 80);
  }

  // 주변 숫자 탭 → 부드럽게 가운데로 스크롤(선택은 스크롤 정착 후 handleScroll이 처리)
  function scrollToIndex(i: number) {
    ref.current?.scrollTo({ top: i * ITEM_H, behavior: "smooth" });
  }

  return (
    <div className="relative w-16" style={{ height: (PAD * 2 + 1) * ITEM_H }}>
      {/* 가운데 선택 표시 밴드 (z-0: 숫자 뒤에 깔림) */}
      <div
        className="pointer-events-none absolute inset-x-0 top-1/2 z-0 -translate-y-1/2 rounded-none bg-surface-elevated ring-1 ring-hairline"
        style={{ height: ITEM_H }}
      />
      {/* 숫자 레이어: relative + z-10 으로 밴드 위에 그려지게 함 (안 그러면 absolute 밴드가 숫자를 덮음) */}
      <div
        ref={ref}
        onScroll={handleScroll}
        className="no-scrollbar relative z-10 h-full snap-y snap-mandatory overflow-y-scroll"
      >
        <div style={{ height: PAD * ITEM_H }} />
        {values.map((v, i) => (
          <div
            key={v}
            onClick={() => scrollToIndex(i)}
            className={`flex cursor-pointer snap-center items-center justify-center text-lg tabular-nums ${
              i === index ? "font-bold text-on-dark" : "text-muted"
            }`}
            style={{ height: ITEM_H }}
          >
            {v}
          </div>
        ))}
        <div style={{ height: PAD * ITEM_H }} />
      </div>
    </div>
  );
}
