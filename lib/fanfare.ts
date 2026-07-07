// 축하 팡파레 사운드 (외부 오디오 파일 없이 Web Audio API로 생성).
// iOS Safari는 사용자 제스처(탭) 안에서 호출해야 소리가 나므로,
// 버튼 클릭 핸들러에서 직접 호출한다(팝업 렌더 시점이 아니라).
// 오디오가 막혀도 조용히 실패하고 시각 연출만 진행된다.
export function playFanfare(): void {
  if (typeof window === "undefined") return;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;

    const ctx = new Ctx();
    if (ctx.state === "suspended") void ctx.resume();

    const now = ctx.currentTime;
    // C5 → E5 → G5 → C6 상승 아르페지오
    const melody = [523.25, 659.25, 783.99, 1046.5];
    const step = 0.13;
    const dur = 0.2;

    const note = (freq: number, start: number, length: number, peak = 0.22) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(peak, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + length + 0.03);
    };

    melody.forEach((freq, i) => note(freq, now + i * step, dur));
    // 마지막 화음 (C-E-G) 살짝 길게
    const chordStart = now + melody.length * step;
    [523.25, 659.25, 783.99].forEach((freq) =>
      note(freq, chordStart, 0.5, 0.16),
    );

    // 재생 끝난 뒤 컨텍스트 정리
    window.setTimeout(() => void ctx.close(), 1500);
  } catch {
    // 오디오 실패는 무시 (시각 연출만으로도 충분)
  }
}
