// 러닝 페이스 계산 (거리/시간에서 파생 — 별도 저장하지 않음)
// 반환: "5분 45초" 형식, 계산 불가 시 null

export function formatPace(distanceKm: number, durationMin: number): string | null {
  if (distanceKm <= 0 || durationMin <= 0) return null;
  const secPerKm = (durationMin * 60) / distanceKm;
  let m = Math.floor(secPerKm / 60);
  let s = Math.round(secPerKm % 60);
  if (s === 60) {
    m += 1;
    s = 0;
  }
  return `${m}분 ${String(s).padStart(2, "0")}초`;
}
