"use client";

// BMW 로고 스타일 4분면 배지 (달력 날짜 배경용)
// 위치 매핑: 상체=우상(파랑), 하체=우하(흰색), 러닝=좌상(흰색)
// 셋 다 완료 시 좌하(파랑)까지 채워 BMW 로고 완성
const BMW_BLUE = "#0066b1";

// SVG 좌표: 중심(18,18), 반지름 16. y축은 아래로 증가
const QUAD = {
  topRight:    "M18,18 L18,2  A16,16 0 0 1 34,18 Z", // 우상
  bottomRight: "M18,18 L34,18 A16,16 0 0 1 18,34 Z", // 우하
  bottomLeft:  "M18,18 L18,34 A16,16 0 0 1 2,18  Z", // 좌하
  topLeft:     "M18,18 L2,18  A16,16 0 0 1 18,2  Z", // 좌상
};

export default function DayBadge({
  hasRunning,
  hasUpper,
  hasLower,
  size = 36,
}: {
  hasRunning: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  size?: number;
}) {
  const any = hasRunning || hasUpper || hasLower;
  if (!any) return null;
  const all = hasRunning && hasUpper && hasLower;

  return (
    <svg
      viewBox="0 0 36 36"
      width={size}
      height={size}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, margin: "auto" }}
    >
      {/* 베이스: 약간 불투명한 흰 원 */}
      <circle cx="18" cy="18" r="16" fill="rgba(255,255,255,0.12)" />
      {/* 러닝 = 좌상 흰색 */}
      {hasRunning && <path d={QUAD.topLeft} fill="#ffffff" opacity="0.4" />}
      {/* 상체 = 우상 파랑 */}
      {hasUpper && <path d={QUAD.topRight} fill={BMW_BLUE} opacity="0.55" />}
      {/* 하체 = 우하 흰색 */}
      {hasLower && <path d={QUAD.bottomRight} fill="#ffffff" opacity="0.4" />}
      {/* 셋 다 완료 시 좌하 파랑으로 로고 완성 */}
      {all && <path d={QUAD.bottomLeft} fill={BMW_BLUE} opacity="0.55" />}
    </svg>
  );
}
