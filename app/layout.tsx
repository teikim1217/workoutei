import type { Metadata, Viewport } from "next";
import "./globals.css";
import MStripe from "@/components/MStripe";
import TransitionOverlay from "@/components/TransitionOverlay";

export const metadata: Metadata = {
  title: "WORKOUTEI",
  description: "개인용 운동 기록 앱",
  // iOS 홈 화면 앱(standalone) 메타 → apple-mobile-web-app-capable /
  // apple-mobile-web-app-status-bar-style / apple-mobile-web-app-title 생성
  appleWebApp: {
    capable: true,
    title: "WORKOUTEI",
    statusBarStyle: "black-translucent",
  },
  // apple-touch-icon 링크
  icons: {
    apple: "/apple-touch-icon.png",
  },
  // Next 16은 appleWebApp.capable을 표준 mobile-web-app-capable로 내보내므로,
  // 구형 iOS 호환을 위해 레거시 apple-mobile-web-app-capable도 명시적으로 추가
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

// 다크 테마 + iOS Safe Area(viewportFit cover로 노치/홈 인디케이터 영역까지 그림)
export const viewport: Viewport = {
  // 그라데이션 상단색과 맞춰 사파리 상단 크롬이 배경과 한 몸이 되게
  themeColor: "#1e1e1e",
  colorScheme: "dark",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      {/* Pretendard (CDN). React 19가 <head>로 hoist */}
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
      />
      <body className="flex min-h-full flex-col">
        {/*
         * 전역 M 스트라이프: 화면 최상단 고정.
         * 노치/다이나믹 아일랜드 영역(env(safe-area-inset-top))은 검정으로 채우고,
         * 그 바로 아래에 4px 트리컬러 스트라이프. 콘텐츠는 globals.css body padding-top
         * (= env(safe-area-inset-top) + 4px)으로 스트라이프 아래에서 시작.
         */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-0 z-[100]"
          style={{
            paddingTop: "env(safe-area-inset-top)",
            background: "#1e1e1e",
          }}
        >
          <MStripe />
        </div>
        {/* 전역 화면 전환 오버레이 (페이지 전환에도 상주) */}
        <TransitionOverlay />
        {children}
      </body>
    </html>
  );
}
