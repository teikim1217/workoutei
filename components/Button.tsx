import type { ButtonHTMLAttributes } from "react";

// 주 버튼: 높이 56px, radius 0, 텍스트 700.
// - primary: 투명 배경 + 1px 흰 테두리 + 흰 텍스트
// - solid:   흰 배경 + 검정 텍스트
type Variant = "primary" | "solid";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export default function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex h-14 w-full select-none touch-manipulation items-center justify-center rounded-none px-6 text-base font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40";
  const byVariant =
    variant === "solid"
      ? "bg-white text-black active:bg-white/90"
      : "border border-white bg-transparent text-white active:bg-white/10";

  return <button className={`${base} ${byVariant} ${className}`} {...props} />;
}
