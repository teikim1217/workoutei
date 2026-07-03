import type { MetadataRoute } from "next";

// PWA 매니페스트 (Next가 /manifest.webmanifest로 서빙하고 <link rel="manifest">를 자동 삽입)
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WORKOUTEI",
    short_name: "WORKOUTEI",
    description: "개인용 운동 기록 앱",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    // 배경 그라데이션 상단(#1e1e1e)과 일치
    background_color: "#1e1e1e",
    theme_color: "#1e1e1e",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
