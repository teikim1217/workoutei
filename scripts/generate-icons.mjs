// PWA 아이콘 생성기: 소스 이미지(assets/icon-source.png)를 512/192/180 PNG로 리사이즈.
// 소스(마스코트 원본)는 배포에 실리지 않도록 public 밖 assets/에 둔다.
// 정사각으로 center-cover 후 검정으로 플래튼(투명 코너 대비) → public/에 산출.
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const publicDir = join(root, "public");
const source = join(root, "assets", "icon-source.png");

const targets = [
  { size: 512, file: "icon-512.png" },
  { size: 192, file: "icon-192.png" },
  { size: 180, file: "apple-touch-icon.png" },
];

const meta = await sharp(source).metadata();
console.log(`source: ${meta.width}x${meta.height} (alpha: ${meta.hasAlpha})`);

for (const t of targets) {
  await sharp(source)
    .resize(t.size, t.size, { fit: "cover", position: "centre" })
    .flatten({ background: "#000000" }) // 투명 코너가 있으면 검정으로 채움
    .png()
    .toFile(join(publicDir, t.file));
  console.log("generated", t.file);
}
