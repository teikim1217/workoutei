import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 개발 중 아이폰 등 같은 Wi-Fi 기기에서 LAN IP로 접속할 때
  // Next.js가 개발 리소스(_next/webpack-hmr 등) 요청을 차단하는 걸 허용.
  // (IP가 DHCP로 바뀌면 아래 목록도 갱신 필요)
  allowedDevOrigins: ["192.168.219.104", "192.168.219.*"],
};

export default nextConfig;
