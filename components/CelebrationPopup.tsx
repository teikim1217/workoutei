"use client";

import { useEffect, useState } from "react";

// 러닝 + 상체 + 하체를 모두 마쳤을 때 뜨는 축하 오버레이.
// 3초 뒤 자동으로 사라지고(onDone 호출), 화면을 탭하면 즉시 닫힌다.
// 팡파레 사운드는 트리거 쪽에서 playFanfare()로 재생한다.

// 색종이 색: M 트리컬러 + 흰색 (장식 한정 사용이므로 여기서만 하드코딩)
const CONFETTI_COLORS = ["#0066b1", "#1c69d4", "#e22718", "#ffffff"];

export default function CelebrationPopup({ onDone }: { onDone: () => void }) {
  // 색종이 조각은 마운트 시 1회만 생성 (매 렌더 흔들림 방지).
  // 이 컴포넌트는 클릭 이후에만 렌더되므로 SSR 하이드레이션 이슈 없음.
  const [pieces] = useState(() =>
    Array.from({ length: 48 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.7,
      duration: 1.6 + Math.random() * 1.2,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      width: 6 + Math.random() * 8,
    })),
  );

  useEffect(() => {
    const t = window.setTimeout(onDone, 3000); // 3초 뒤 자동 삭제
    return () => window.clearTimeout(t);
  }, [onDone]);

  return (
    <div
      role="alertdialog"
      aria-label="모든 운동 완료"
      onClick={onDone}
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center overflow-hidden bg-black/85 px-8 text-center"
    >
      {/* 색종이 */}
      {pieces.map((p, i) => (
        <span
          key={i}
          className="celebrate-confetti"
          style={{
            left: `${p.left}%`,
            width: p.width,
            height: p.width * 0.4,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}

      <div className="celebrate-pop relative z-10">
        <p className="text-6xl leading-none">🎉</p>
        <p className="mt-5 text-3xl font-bold text-on-dark">축하합니다!</p>
        <p className="mt-2 text-lg font-light text-body">
          모든 운동을 다 하셨네요!
        </p>
      </div>
    </div>
  );
}
