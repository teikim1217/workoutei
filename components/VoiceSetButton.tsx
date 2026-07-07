"use client";

import { useEffect, useRef, useState } from "react";
import { parseSets, type ParsedSet } from "@/lib/parseSets";

// iOS 사파리(14.5+)/크롬의 Web Speech API(webkitSpeechRecognition)로
// "80 10" 같은 말을 듣고 중량/횟수 세트로 변환해 onResult로 넘긴다.
// - 인터넷으로 음성을 서버 처리(오프라인 불가), 첫 사용 시 마이크 권한 요청.
// - start()는 반드시 사용자 탭 안에서 호출(아이폰 정책).

// 표준 lib.dom에 webkitSpeechRecognition 타입이 없어 최소한만 선언
interface SpeechRecognitionAlt {
  transcript: string;
}
interface SpeechRecognitionRes {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlt;
}
interface SpeechRecognitionResultEvt {
  readonly resultIndex: number;
  readonly results: { readonly length: number; [i: number]: SpeechRecognitionRes };
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onresult: ((e: SpeechRecognitionResultEvt) => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export default function VoiceSetButton({
  onResult,
}: {
  onResult: (pairs: ParsedSet[]) => void;
}) {
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setSupported(!!getCtor());
    // 언마운트 시 진행 중인 인식 중단
    return () => recRef.current?.abort();
  }, []);

  function start() {
    const Ctor = getCtor();
    if (!Ctor) {
      setSupported(false);
      return;
    }
    const rec = new Ctor();
    rec.lang = "ko-KR";
    rec.interimResults = true; // 말하는 도중 미리 보여주기
    rec.continuous = false; // 한 번 말하면 종료
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      setListening(true);
      setTranscript("");
      setError(null);
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setError("마이크 권한이 필요해요 (설정에서 허용)");
      } else if (e.error === "no-speech") {
        setError("소리가 안 들렸어요. 다시 시도해 주세요");
      } else if (e.error !== "aborted") {
        setError("음성 인식에 실패했어요. 다시 시도해 주세요");
      }
    };
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
    };
    rec.onresult = (e) => {
      let finalText = "";
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const txt = res[0]?.transcript ?? "";
        if (res.isFinal) finalText += txt;
        else interim += txt;
      }
      setTranscript(finalText || interim);
      if (finalText) {
        const pairs = parseSets(finalText);
        if (pairs.length > 0) onResult(pairs);
      }
    };

    recRef.current = rec;
    try {
      rec.start();
    } catch {
      // 이미 시작된 경우 등 → 무시
    }
  }

  function toggle() {
    if (listening) {
      recRef.current?.stop();
    } else {
      start();
    }
  }

  if (!supported) {
    return (
      <p className="mb-3 text-xs leading-relaxed text-muted">
        이 브라우저는 음성 입력을 지원하지 않아요. (iOS는 사파리에서 사용)
      </p>
    );
  }

  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={listening}
        className={`flex h-12 w-full select-none items-center justify-center gap-2 text-sm font-bold uppercase tracking-wide ${
          listening
            ? "bg-white text-black"
            : "border border-hairline bg-transparent text-body active:bg-surface-card"
        }`}
      >
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            listening ? "animate-pulse bg-black" : "bg-body"
          }`}
        />
        {listening ? "듣는 중… (탭하면 종료)" : "🎤 음성으로 입력"}
      </button>

      {/* 인식 결과 / 안내 */}
      {(transcript || error) && (
        <p className="mt-2 text-xs leading-relaxed text-muted">
          {error ? error : `들린 말: ${transcript}`}
        </p>
      )}
      {!transcript && !error && !listening && (
        <p className="mt-2 text-xs leading-relaxed text-muted">
          예: “80 10” 또는 “80 10, 82 8, 85 6”
        </p>
      )}
    </div>
  );
}
