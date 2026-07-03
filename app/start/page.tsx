import Link from "next/link";

// "YYYY-MM-DD" → "M월 D일" (유효하지 않으면 null)
function toKoreanDate(iso?: string): string | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [, m, d] = iso.split("-").map(Number);
  return `${m}월 ${d}일`;
}

export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const validDate = typeof date === "string" ? date : undefined;
  // 날짜가 있으면 각 종목 링크에 그대로 전달
  const q = validDate ? `?date=${validDate}` : "";
  const label = toKoreanDate(validDate);

  const OPTIONS = [
    { label: "러닝", href: `/workout/running${q}` },
    { label: "상체", href: `/workout/upper${q}` },
    { label: "하체", href: `/workout/lower${q}` },
  ];

  return (
    <main className="flex flex-1 flex-col px-6">
      {/* 상단: 홈으로 뒤로가기 */}
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

      <h1 className="mt-6 text-2xl font-bold text-on-dark">무엇을 할까요?</h1>
      {/* 특정 날짜로 기록 중이면 명확히 표시 (오늘이 아닌 날짜 저장) */}
      {label && (
        <p className="mt-1 text-xs tracking-wide text-muted">
          {label} 기록 추가 중
        </p>
      )}

      {/* 세로 큰 버튼 3개 */}
      <div className="mt-8 flex flex-col gap-4">
        {OPTIONS.map((o) => (
          <Link
            key={o.href}
            href={o.href}
            className="flex h-20 w-full select-none items-center justify-center border border-white bg-transparent text-xl font-bold text-white active:bg-white/10"
          >
            {o.label}
          </Link>
        ))}
      </div>
    </main>
  );
}
