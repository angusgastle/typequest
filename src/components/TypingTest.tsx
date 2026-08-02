"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TestContent, TestResult } from "@/lib/types";
import { getStreakMultiplier } from "@/lib/utils";
import { Keyboard } from "./Keyboard";
import { Button } from "./ui";

const pulseKeyframes = `
	@keyframes pulse {
		0%, 100% { opacity: 0.4; }
		50% { opacity: 1; }
	}
`;

interface TypingTestProps {
	content: TestContent;
	level: number;
	streak: number;
	onComplete: (result: TestResult) => void;
	onExit: () => void;
}

type Status = "idle" | "typing" | "done";

export function TypingTest({
	content,
	level,
	streak,
	onComplete,
	onExit,
}: TypingTestProps) {
	const prompt = content.prompt;
	const [typed, setTyped] = useState("");
	const [status, setStatus] = useState<Status>("idle");
	const [lastState, setLastState] = useState<"correct" | "wrong" | null>(null);
	const [pressedChar, setPressedChar] = useState<string | null>(null);
	const [backspaces, setBackspaces] = useState(0);
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
				setBackspaces((b) => b + 1);
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
		[status, prompt],
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
		const accuracy = typed.length
			? Math.round((correct / typed.length) * 100)
			: 0;
		const minutes = Math.max(elapsed, 1) / 60;
		const wpm = Math.max(1, Math.round(correct / 5 / minutes));
		const streakMultiplier = getStreakMultiplier(streak);
		const score = Math.max(
			0,
			Math.floor(
				(10 + wpm + Math.round(accuracy * 0.5) + level * 2) * streakMultiplier,
			),
		);
		const result: TestResult = {
			accuracy,
			wpm,
			errors,
			score,
			timeToComplete: Math.round(elapsed),
			backspaces,
		};
		onComplete(result);
	}, [typed, prompt, level, streak, backspaces, onComplete]);

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

	// Auto-scroll the prompt to keep the current character visible
	useEffect(() => {
		if (status === "typing" && charsRef.current[currentIndex]) {
			const el = charsRef.current[currentIndex];
			setTimeout(() => {
				el.scrollIntoView({
					behavior: "smooth",
					block: "center",
				});
			}, 0);
		}
	}, [currentIndex, status]);

	// Parse prompt into words and spaces to prevent mid-word splitting
	const promptWords = useMemo(() => {
		const words: Array<{ text: string; isSpace: boolean }> = [];
		let current = "";
		for (const ch of prompt) {
			if (ch === " ") {
				if (current) {
					words.push({ text: current, isSpace: false });
					current = "";
				}
				words.push({ text: " ", isSpace: true });
			} else {
				current += ch;
			}
		}
		if (current) words.push({ text: current, isSpace: false });
		return words;
	}, [prompt]);

	return (
		<div className="flex flex-col h-screen gap-4">
			{/* Header row: title + timer (fixed, not scrolling) */}
			<div className="flex-shrink-0 flex items-center justify-between gap-3 px-4 pt-4">
				<div>
					<div className="font-display text-lg md:text-xl font-bold text-grape">
						🗺️ {content.title}
					</div>
					<div className="text-sm text-ink/50">{content.theme}</div>
				</div>
				<TimerRing seconds={timeLeft} total={duration} pct={ringPct} />
			</div>

			{/* The prompt — scrollable area that grows to fill space */}
			<div
				className="flex-grow overflow-y-auto rounded-[2rem] bg-white/70 backdrop-blur border-2 border-white m-4 p-6 md:p-8 flex flex-col items-center justify-start"
				tabIndex={0}
			>
				<style>{pulseKeyframes}</style>
				<p className="font-display text-2xl md:text-4xl leading-relaxed tracking-wide min-w-0 break-words">
					{promptWords.map((word, wordIdx) => {
						if (word.isSpace) return <span key={`space-${wordIdx}`}> </span>;

						// Each word is wrapped in an inline-block to prevent mid-word breaks
						return (
							<span key={`word-${wordIdx}`} className="inline-block">
								{word.text.split("").map((ch, charIdx) => {
									// Calculate the absolute character index in the original prompt
									let charIndex = 0;
									for (let i = 0; i < wordIdx; i++) {
										charIndex += promptWords[i].text.length;
									}
									charIndex += charIdx;

									const isCurrent = charIndex === currentIndex;
									const isTyped = charIndex < currentIndex;
									const isCorrect = isTyped && typed[charIndex] === ch;
									const isWrong = isTyped && typed[charIndex] !== ch;

									return (
										<span
											key={charIdx}
											ref={(el) => {
												if (el) (charsRef.current as any)[charIndex] = el;
											}}
											className="px-0.5 rounded-md"
											style={{
												backgroundColor: isCurrent
													? "rgb(254 228 92 / 0.4)"
													: isWrong
														? "rgb(239 68 68 / 0.2)"
														: "transparent",
												color: isCorrect
													? "rgb(78 205 196)"
													: isWrong
														? "rgb(239 68 68)"
														: "rgb(45 30 21 / 0.21)",
												textDecoration: isWrong ? "line-through" : "none",
												textDecorationColor: isWrong
													? "rgb(239 68 68)"
													: "transparent",
												animation: isCurrent
													? "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
													: "none",
											}}
										>
											{ch}
										</span>
									);
								})}
							</span>
						);
					})}
				</p>
				<AnimatePresence>
					{status === "idle" && (
						<motion.div
							key="hint"
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -8 }}
							transition={{ duration: 0.3 }}
							className="mt-4 text-coral font-bold text-xl md:text-2xl"
						>
							<motion.span
								animate={{ opacity: [0.4, 1, 0.4] }}
								transition={{ duration: 1.2, repeat: Infinity }}
							>
								▶ Start typing!
							</motion.span>
						</motion.div>
					)}
				</AnimatePresence>
			</div>

			{/* Virtual keyboard + hands (sticky at bottom) */}
			<div className="flex-shrink-0 px-4 pb-4">
				<Keyboard
					nextChar={nextChar}
					pressedChar={pressedChar}
					state={lastState}
				/>
			</div>

			{/* Footer stats (sticky at very bottom) */}
			<div className="flex-shrink-0 flex items-center justify-between px-4 pb-4 text-sm">
				<div className="font-display text-ink/60">
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
				<circle
					cx="30"
					cy="30"
					r={R}
					fill="none"
					stroke="#e8fbff"
					strokeWidth="6"
				/>
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
