"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface RecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface RecognitionEvent {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const ERROR_COPY: Record<string, string> = {
  "not-allowed": "Microphone access was blocked. Allow it in your browser's site settings and try again.",
  "service-not-allowed": "Voice typing is blocked by your browser or device settings.",
  "audio-capture": "No microphone was found.",
  network: "Voice typing needs an internet connection in this browser.",
  "language-not-supported": "That language isn't supported for voice typing here.",
};

/**
 * Browser speech-to-text. Final phrases go to `onFinal`; the in-progress
 * phrase is exposed as `interim`. Chrome ends sessions after silence, so we
 * restart until the user stops.
 */
export function useDictation(onFinal: (text: string) => void, lang: string) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognition = useRef<Recognition | null>(null);
  const wanted = useRef(false);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  useEffect(() => {
    setSupported(getCtor() !== null);
    return () => {
      wanted.current = false;
      recognition.current?.stop();
    };
  }, []);

  const stop = useCallback(() => {
    wanted.current = false;
    recognition.current?.stop();
    setListening(false);
    setInterim("");
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor || wanted.current) return;

    const instance = new Ctor();
    instance.lang = lang;
    instance.continuous = true;
    instance.interimResults = true;

    instance.onresult = (event) => {
      let pending = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) onFinalRef.current(result[0].transcript);
        else pending += result[0].transcript;
      }
      setInterim(pending);
    };
    instance.onerror = (event) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      setError(ERROR_COPY[event.error] ?? "Voice typing stopped unexpectedly.");
      wanted.current = false;
    };
    instance.onend = () => {
      if (wanted.current) {
        try {
          instance.start();
          return;
        } catch {
          // fall through and stop
        }
      }
      wanted.current = false;
      setListening(false);
      setInterim("");
    };

    recognition.current = instance;
    wanted.current = true;
    setError(null);
    try {
      instance.start();
      setListening(true);
    } catch {
      wanted.current = false;
      setError("Could not start the microphone.");
    }
  }, [lang]);

  return { supported, listening, interim, error, start, stop };
}
