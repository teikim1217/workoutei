// 음성 인식 텍스트에서 숫자를 뽑아 세트(중량/횟수)로 변환하는 순수 함수.
// 예) "80 10"            → [{weight:"80", reps:"10"}]
//     "80킬로 10개"       → [{weight:"80", reps:"10"}]
//     "80 10, 82 8, 85 6" → 세트 3개
//     "62.5 8"           → [{weight:"62.5", reps:"8"}]
// 기본은 "중량 → 횟수" 순서(weightFirst=true). 단위 단어(킬로/키로/kg/개/회 등)는
// 숫자만 추출하므로 자연히 무시된다.

export interface ParsedSet {
  weight: string;
  reps: string;
}

export function parseSets(
  transcript: string,
  weightFirst = true,
): ParsedSet[] {
  // "1세트", "2번째" 같은 세트 번호는 데이터 숫자가 아니므로 먼저 제거
  const cleaned = transcript.replace(/\d+\s*(?:세트|번째)/g, " ");
  // 소수 포함 숫자 토큰만 추출 (쉼표/한글/단위는 구분자로 무시됨)
  const nums = cleaned.match(/\d+(?:\.\d+)?/g) ?? [];

  const pairs: ParsedSet[] = [];
  for (let i = 0; i < nums.length; i += 2) {
    const a = nums[i];
    const b = nums[i + 1] ?? "";
    pairs.push(
      weightFirst
        ? { weight: a, reps: b }
        : { weight: b, reps: a },
    );
  }
  return pairs;
}
