"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Keyboard } from "./Keyboard";
import { Button } from "./ui";
import type { TestContent, TestResult } from "@/lib/types";

interface TypingTestProps {
  content: TestContent;
  level: number;
  onComplete: (result: TestResult) => void;
  onExit: () => void;
}

type Status = "idle" | "typing" | "done";

export function TypingTest({ content, level, onComplete, onExit }: TypingTestProps) {
  const prompt = content.prompt;
  const [typed, setTyped] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [lastState, setLastState] = useState<"correct" | "wrong" | null>(null);
  const [pressedChar, setPressedChar] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const charsRef = useRef<HTMLSpanElement[]>([]);

  // Duration: generous, scales with length and level (higher level = tighter).
  const duration = useMemo(() => {
    const words = prompt.trim().split(/\s+/).length;
    const base = Math.max(45, words * 5);
    return Math.round(base + (60 - level * 2));
  }, [prompt, level]);

  useEffect(() => {
    if (status === "typing" && timeLeft > 0) {
      const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
      return () => clearTimeout(id);
    }
    if (status === "typing" && timeLeft === 0) {
      // Time's up — finish
      finish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, timeLeft]);

  useEffect(() => setTimeLeft(duration), [duration]);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (status === "done") return;
      // Allow nav shortcuts
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key;

      // Start on first printable or space
      if (status === "idle" && (key.length === 1 || key === " ")) {
        startTimeRef.current = Date.now();
        setStatus("typing");
      }

      if (key === "Backspace") {
        e.preventDefault();
        setTyped((t) => t.slice(0, -1));
        setLastState(null);
        return;
      }

      if (key.length !== 1) return; // ignore special keys except handled ones
      e.preventDefault();

      setPressedChar(key);
      setTimeout(() => setPressedChar(null), 180);

      setTyped((t) => {
        if (t.length >= prompt.length) return t;
        const next = t + key;
        const idx = t.length;
        const correct = key === prompt[idx];
        setLastState(correct ? "correct" : "wrong");
        return next;
      });
    },
    [status, prompt]
  );

  // Finish + score
  const finish = useCallback(() => {
    setStatus("done");
    const elapsed = (Date.now() - (startTimeRef.current ?? Date.now())) / 1000;
    let correct = 0;
    for (let i = 0; i < typed.length; i++) {
      if (typed[i] === prompt[i]) correct++;
    }
    const errors = Math.max(0, typed.length - correct);
    const accuracy = typed.length ? Math.round((correct / typed.length) * 100) : 0;
    const minutes = Math.max(elapsed, 1) / 60;
    const wpm = Math.max(1, Math.round(correct / 5 / minutes));
    const score = Math.max(
      0,
      Math.round(wpm * (accuracy / 100) * 10) + level * 10
    );
    const result: TestResult = {
      accuracy,
      wpm,
      errors,
      score,
      timeToComplete: Math.round(elapsed),
    };
    onComplete(result);
  }, [typed, prompt, level, onComplete]);

  useEffect(() => {
    if (status === "typing" && typed.length >= prompt.length) {
      finish();
    }
  }, [typed, status, prompt.length, finish]);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  const currentIndex = typed.length;
  const nextChar = currentIndex < prompt.length ? prompt[currentIndex] : null;
  const elapsed = duration - timeLeft;
  const ringPct = timeLeft / duration;

  return (
    <div className="flex flex-col gap-4">
      {/* Header row: title + timer */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-display text-lg md:text-xl font-bold text-grape">
            🗺️ {content.title}
          </div>
          <div className="text-sm text-ink/50">{content.theme}</div>
        </div>
        <TimerRing seconds={timeLeft} total={duration} pct={ringPct} />
      </div>

      {/* The prompt — big and reactive */}
      <div
        className="rounded-[2rem] bg-white/70 backdrop-blur border-2 border-white p-6 md:p-8 min-h-[180px] flex items-center"
        tabIndex={0}
      >
        <p className="font-display text-2xl md:text-4xl leading-relaxed tracking-wide">
          {prompt.split("").map((ch, i) => {
            const isCurrent = i === currentIndex;
            const isTyped = i < currentIndex;
            const isCorrect = isTyped && typed[i] === ch;
            const isWrong = isTyped && typed[i] !== ch;
            return (
              <span
                key={i}
                ref={(el) => {
                  if (el) (charsRef.current as any)[i] = el;
                }}
                className={
                  isCurrent
                    ? "bg-sunny/40 rounded-md px-0.5 animate-pulse"
                    : isCorrect
                    ? "text-teal"
                    : isWrong
                    ? "text-red-500 bg-red-100 rounded-md px-0.5 line-through decoration-red-500"
                    : "text-ink/35"
                }
              >
                {ch === " " && !isCurrent && !isTyped ? " " : ch}
              </span>
            );
          })}
          {status === "idle" && (
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="ml-3 text-coral font-bold text-xl md:text-2xl"
            >
              ▶ Start typing!
            </motion.span>
          )}
        </p>
      </div>

      {/* Virtual keyboard + hands */}
      <Keyboard
        nextChar={nextChar}
        pressedChar={pressedChar}
        state={lastState}
      />

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="font-display text-sm text-ink/60">
          {typed.length} / {prompt.length} characters · {elapsed}s elapsed
        </div>
        <Button variant="ghost" size="sm" onClick={onExit}>
          ✕ Quit
        </Button>
      </div>
    </div>
  );
}

function TimerRing({
  seconds,
  total,
  pct,
}: {
  seconds: number;
  total: number;
  pct: number;
}) {
  const R = 26;
  const C = 2 * Math.PI * R;
  const danger = seconds <= 10;
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 60 60">
        <circle cx="30" cy="30" r={R} fill="none" stroke="#e8fbff" strokeWidth="6" />
        <motion.circle
          cx="30"
          cy="30"
          r={R}
          fill="none"
          stroke={danger ? "#ff6b6b" : "#4ecdc4"}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={C}
          animate={{ strokeDashoffset: C * (1 - pct) }}
          transition={{ duration: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center font-display font-bold">
        <div className="text-center leading-none">
          <div className="text-lg tabular-nums">{seconds}</div>
          <div className="text-[10px] text-ink/40">of {total}</div>
        </div>
      </div>
    </div>
  );
}
