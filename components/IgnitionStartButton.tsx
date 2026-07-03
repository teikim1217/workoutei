"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

// 시동 연출 1단계(스트라이프 확산). 2단계 디밍 전환은 layout의 TransitionOverlay가 담당.
// 그라데이션은 처음부터 버튼 전체 폭으로 완성돼 있고 clip-path로 가렸다가 드러낸다(scaleX 아님).
const IGNITION_GRADIENT =
  "linear-gradient(to right, #0066b1 0%, #1c69d4 45%, #1c69d4 55%, #e22718 65%, #e22718 100%)";

export default function IgnitionStartButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<"idle" | "stripe">("idle");
  const startedRef = useRef(false); // 연타 방지
  const dimStartedRef = useRef(false); // 디밍 신호 중복 방지
  const fallbackRef = useRef<number | undefined>(undefined); // transitionend 미발화 대비

  // 2단계 트리거: 전역 오버레이(TransitionOverlay)에 디밍 시작을 알림
  function startDim() {
    if (dimStartedRef.current) return;
    dimStartedRef.current = true;
    window.clearTimeout(fallbackRef.current);
    window.dispatchEvent(new CustomEvent("ignition-dim", { detail: { href } }));
  }

  function handleClick() {
    if (startedRef.current) return;
    startedRef.current = true;

    // prefers-reduced-motion: 애니메이션 전부 생략하고 즉시 전환
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      router.push(href);
      return;
    }

    // 1단계: 스트라이프 확산 시작 (clip-path 좌→우 전환)
    setPhase("stripe");
    // transitionend가 발화하지 않는 예외 대비 0.8초 안전 타임아웃
    fallbackRef.current = window.setTimeout(startDim, 800);
  }

  // 1단계 완료(clip-path 전환 끝)를 감지해 2단계 디밍으로
  function handleOverlayTransitionEnd(e: React.TransitionEvent) {
    if (e.propertyName === "clip-path") startDim();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={phase !== "idle"}
      className="relative inline-flex h-14 w-full select-none touch-manipulation items-center justify-center overflow-hidden border border-white bg-transparent px-6 text-base font-bold text-white"
    >
      {/* 1단계: 그라데이션 오버레이. clip-path로 좌→우로 드러남(왼쪽 파랑 고정) */}
      <span
        aria-hidden
        onTransitionEnd={handleOverlayTransitionEnd}
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: IGNITION_GRADIENT,
          clipPath: phase === "idle" ? "inset(0 100% 0 0)" : "inset(0 0 0 0)",
          transition: "clip-path 0.5s ease-out",
        }}
      />
      {/* 텍스트는 오버레이 위에서 흰색 유지 */}
      <span className="relative z-10">{children}</span>
    </button>
  );
}
