"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

/*
 * 전역 전환 오버레이 (layout에 상주 → 페이지 전환에도 유지).
 * 흐름: ignition-dim 이벤트 → 흰색 opacity 0→1(0.6s ease-in, 숨 들이쉬듯)
 *      → 완전히 하얘진 시점(animationend)에 router.push
 *      → 도착 페이지 마운트(경로 변경) 감지 → opacity 1→0(0.5s ease-out)으로 걷힘.
 */
export default function TransitionOverlay() {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<"idle" | "in" | "out">("idle");
  const hrefRef = useRef<string | null>(null);
  const navigatedRef = useRef(false);

  // 버튼이 보내는 디밍 시작 신호 수신
  useEffect(() => {
    function onDim(e: Event) {
      const href = (e as CustomEvent<{ href: string }>).detail?.href;
      if (!href) return;
      hrefRef.current = href;
      navigatedRef.current = false;
      setPhase("in");
    }
    window.addEventListener("ignition-dim", onDim);
    return () => window.removeEventListener("ignition-dim", onDim);
  }, []);

  // 네비게이션 완료(경로 변경) 감지 → 디밍 아웃 시작
  useEffect(() => {
    if (navigatedRef.current && phase === "in") {
      setPhase("out");
    }
    // phase는 최신값을 참조하되 경로 변경 시에만 반응
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function handleAnimationEnd() {
    if (phase === "in") {
      // 완전히 하얘진 시점에 전환 (오버레이는 그대로 흰색 유지)
      if (!navigatedRef.current) {
        navigatedRef.current = true;
        if (hrefRef.current) router.push(hrefRef.current);
      }
    } else if (phase === "out") {
      // 다 걷혔으면 오버레이 제거
      navigatedRef.current = false;
      hrefRef.current = null;
      setPhase("idle");
    }
  }

  if (phase === "idle") return null;

  return (
    <div
      aria-hidden
      onAnimationEnd={handleAnimationEnd}
      className="pointer-events-none fixed inset-0 z-[200] bg-white"
      style={{
        // 애니메이션이 못 돌아도 최종 상태로 안착하도록 resting opacity 지정
        opacity: phase === "in" ? 1 : 0,
        animation:
          phase === "in"
            ? "transition-dim-in 0.6s ease-in forwards"
            : "transition-dim-out 0.5s ease-out forwards",
      }}
    />
  );
}
