@AGENTS.md

# 운동 기록 웹앱 (개인용 1인)

이 프로젝트는 개인용(1인) 운동 기록 웹앱이다. **앞으로 모든 작업은 이 문서를 기준으로 한다.**

## 프로젝트 개요
- **스택**: Next.js(App Router) + TypeScript + Tailwind CSS, Vercel 배포 예정
- **사용 기기**: iPhone Safari (모바일 우선 UI, 하단 큰 버튼, 터치 친화적)
- **데이터 저장**: Phase 1은 localStorage. 단, 저장 로직은 반드시 `lib/storage.ts` 한 파일에만 두어 나중에 Supabase로 교체 가능하게 할 것
- **언어**: UI 텍스트는 한국어

## 라우팅 구조
- `/` : 홈 (마지막 운동 후 N일차 + 달력 + 날짜별 요약 + 운동시작하기 버튼)
- `/start` : 러닝/상체/하체 선택
- `/workout/running` : 러닝 수동 입력 (거리km, 시간분, 실내/실외)
- `/workout/upper` : 상체 종목 선택 + 세트 기록
- `/workout/lower` : 하체 종목 선택 + 세트 기록 (상체와 컴포넌트 공유)

## 데이터 모델 (lib/types.ts)
- `WorkoutSession { id, date("YYYY-MM-DD"), running?, exercises[] }`
- `RunningRecord { distanceKm, durationMin, type: "indoor"|"outdoor" }`
- `ExerciseRecord { name, category: "upper"|"lower", sets: SetRecord[] }`
- `SetRecord { weightKg, reps }`
- 요약 시 **"시작 세트"** = `sets[0]`, **"최대 세트"** = 중량 최대(동률이면 횟수 많은 쪽)

## 디자인 시스템 (BMW M 모티브, 다크 모바일 앱)
토큰은 `app/globals.css`에 CSS 변수로 정의하고 Tailwind 유틸로도 노출한다. 재사용 컴포넌트는 `components/MStripe.tsx`, `components/Button.tsx`.

### 색상 (CSS 변수 / Tailwind 유틸)
- `--canvas` #000000 (폴백). **실제 페이지 배경은 고정 그라데이션**: `body::before`(fixed, z-index:-1)로 `linear-gradient(180deg, #1e1e1e 0%, #0a0a0a 45%, #000 100%)` — iOS는 `background-attachment: fixed` 미지원이라 fixed 의사요소로 구현. 스크롤해도 화면 고정(위=밝음/아래=어두움). **컴포넌트 배경 토큰(surface-card 등)은 기존 유지.** theme-color·MStripe safe-area 채움도 #1e1e1e.
- `--surface-card` #1a1a1a (카드·입력 필드) → `bg-surface-card`
- `--surface-elevated` #262626 → `bg-surface-elevated`
- `--hairline` #3c3c3c (1px 구분선·카드 테두리) → `border-hairline`
- `--on-dark` #ffffff (제목·주요 텍스트) → `text-on-dark`
- `--body` #bbbbbb (본문) → `text-body`
- `--muted` #7e7e7e (보조·캡션) → `text-muted`
- `--m-blue-light` #0066b1, `--m-blue-dark` #1c69d4, `--m-red` #e22718 — **M 트리컬러: 4px 스트라이프 장식 전용. 버튼·배경 채움에 절대 사용 금지.** Tailwind 유틸로 노출하지 않음(오용 방지), `MStripe`에서만 사용.

### 타이포그래피
- 폰트: **Pretendard**(layout.tsx CDN), 폴백 -apple-system. 본문 기본 굵기 300.
- **굵기는 700(제목·숫자·버튼)과 300(본문) 두 개만. 400·500 금지.** 무거운 제목 vs 가벼운 본문의 대비가 시그니처.
- 영문 라벨(운동 종목명·단위)은 uppercase + letter-spacing 1.5px + 700.
- 큰 숫자 표시(경과일 등): 64~80px / 700 / `tabular-nums`.

### 형태 규칙
- **border-radius 전부 0.** 예외는 원형 아이콘 버튼(9999px)뿐. 그 사이 값 금지.
- **그림자 금지.** 깊이는 배경색 단차(#000 → #1a1a1a → #262626)와 1px hairline으로만.
- 주 버튼: 배경 투명 또는 #000, 1px 흰 테두리, 흰 텍스트 700, 높이 56px, radius 0 (`Button` variant="primary"). 채움형은 흰 배경·검정 텍스트(variant="solid").
- 구분선: 1px `--hairline`.
- M 트리컬러 스트라이프(`MStripe`): height 4px, 세 색 1/3씩. **`layout.tsx`에서 전역 1회만 렌더링**(화면 최상단 `position: fixed`, 노치 `env(safe-area-inset-top)` 아래에 위치, safe area는 #000으로 채움). **개별 페이지에 추가 금지.** 콘텐츠는 globals.css `body` `padding-top: calc(env(safe-area-inset-top) + 4px)` + 각 페이지 자체 상단 여백으로 스트라이프 아래에서 시작.

### 시동 연출 (홈 "운동시작하기" 버튼)
`components/IgnitionStartButton.tsx`(1단계) + `components/TransitionOverlay.tsx`(2·3단계, **layout에 상주**). **hover·사운드 없음.** 클릭 시 순서 엄수:
1. **스트라이프 확산(0.5s)**: 버튼 내부 그라데이션 오버레이(`linear-gradient(to right, #0066b1 0%, #1c69d4 45%, #1c69d4 55%, #e22718 65%, #e22718 100%)`)를 `clip-path: inset(0 100% 0 0)` → `inset(0 0 0 0)`로 0.5s ease-out 전환(좌→우로 드러냄). **scaleX 금지** — 왼쪽 파랑이 제자리 고정된 채 색이 퍼짐. 텍스트는 오버레이 위 흰색 유지.
2. **디밍 인**: 1단계 `transitionend`(clip-path) 감지 후 `ignition-dim` 커스텀 이벤트 발신 → 전역 오버레이(layout 상주, `z-[200]`)가 흰색 `opacity 0→1`을 **0.6s ease-in**으로 서서히 차오름(숨 들이쉬듯). `@keyframes transition-dim-in`.
3. **전환 + 디밍 아웃**: 오버레이가 완전히 하얘진 시점(`animationend`)에 `router.push`. 오버레이는 layout 상주라 페이지 전환에도 유지되고, 도착 페이지 마운트(경로 변경) 감지 후 `opacity 1→0`을 **0.5s ease-out**으로 걷힘(`@keyframes transition-dim-out`) → 새 화면이 서서히 드러남(중간 끊김 없음).
- 안정성: 클릭 즉시 `disabled`(연타 방지) / `prefers-reduced-motion: reduce`면 애니메이션 생략하고 즉시 전환 / `transitionend` 미발화 대비 0.8s 안전 타임아웃.

## 코딩 규칙
- localStorage 접근 전 반드시 `typeof window !== "undefined"` 체크
- 한 단계씩 작업하고, 내가 확인 요청하기 전에는 다음 단계로 넘어가지 말 것

## iOS 최적화 규칙 (모든 화면에 적용)
전역 처리는 `app/globals.css` + `app/layout.tsx`에 이미 반영됨. 새 화면을 만들 때 아래를 지킬 것.
1. **Safe Area**: `layout.tsx` viewport에 `viewportFit: "cover"`. `body`에 `padding-top/bottom: env(safe-area-inset-*)` 적용됨(전역). **하단 고정 버튼 컨테이너**(`sticky`/`fixed` bottom-0)는 `pb-6` 대신 유틸 클래스 **`pb-safe-button`**(= `calc(16px + env(safe-area-inset-bottom))`)을 써서 홈 인디케이터 위로 띄운다.
2. **입력 줌 방지**: `input/select/textarea` 폰트는 최소 16px (전역 CSS로 강제됨). 폼 컨트롤에 16px 미만 텍스트 클래스 쓰지 말 것.
3. `-webkit-tap-highlight-color: transparent` 전역 적용됨.
4. 버튼·인터랙티브 요소 `touch-action: manipulation` 전역 적용됨(더블탭 줌 방지).
5. `html/body`에 `overscroll-behavior-y: none`(당겨서 새로고침 방지) 전역 적용됨.
6. **탭 피드백**: 기본 하이라이트를 껐으므로 대체 피드백 필요. 배경 없는 버튼은 base 레이어의 `:active → --surface-elevated`가 자동 적용. 색 버튼은 각자 `active:*` 상태를 명시할 것.
7. 버튼 라벨 `user-select: none` 전역 적용됨(길게 눌러도 선택 안 됨). `Button` 컴포넌트는 `select-none touch-manipulation` 포함.
