// M 트리컬러 스트라이프 (장식 전용): height 4px, 세 색상 1/3씩.
// 화면당 최대 1회, 브랜드 마킹 지점에만 사용.
// M 색상은 이 컴포넌트에서만 CSS 변수로 직접 사용(유틸로 노출하지 않음).
export default function MStripe({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`flex h-1 ${className}`}>
      <div
        className="h-full flex-1"
        style={{ backgroundColor: "var(--m-blue-light)" }}
      />
      <div
        className="h-full flex-1"
        style={{ backgroundColor: "var(--m-blue-dark)" }}
      />
      <div
        className="h-full flex-1"
        style={{ backgroundColor: "var(--m-red)" }}
      />
    </div>
  );
}
