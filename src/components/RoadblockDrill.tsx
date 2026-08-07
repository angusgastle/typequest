"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard } from "./Keyboard";
import type { KeyMastery } from "@/lib/types";
import { HOME_KEYS } from "@/lib/roadblock";

const pulseKeyframes = `
	@keyframes pulse {
		0%, 100% { opacity: 0.4; }
		50% { opacity: 1; }
	}
`;

export interface DrillResult {
	accuracy: number;
	errors: number;
	burstsCompleted: number;
	coins: number;
	masteryDelta: KeyMastery;
}

interface RoadblockDrillProps {
	bursts: string[];
	duration?: number;
	onComplete: (result: DrillResult) => void;
	onExit: () => void;
}

type Status = "idle" | "typing" | "done";

export function RoadblockDrill({
	bursts,
	duration = 60,
	onComplete,
	onExit,
}: RoadblockDrillProps) {
	const [burstIdx, setBurstIdx] = useState(0);
	const [typed, setTyped] = useState("");
	const [status, setStatus] = useState<Status>("idle");
	const [lastState, setLastState] = useState<"correct" | "wrong" | null>(null);
	const [pressedChar, setPressedChar] = useState<string | null>(null);
	const [timeLeft, setTimeLeft] = useState(duration);
	const [combo, setCombo] = useState(0);

	const errorsRef = useRef(0);
	const totalKeystrokesRef = useRef(0);
	const correctRef = useRef(0);
	const burstsCompletedRef = useRef(0);
	const masteryRef = useRef<KeyMastery>({});
	const startTimeRef = useRef<number | null>(null);

	const burst = bursts[burstIdx] ?? "";
	const currentChar = burst[typed.length] ?? null;

	// Timer
	useEffect(() => {
		if (status === "typing" && timeLeft > 0) {
			const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
			return () => clearTimeout(id);
		}
		if (status === "typing" && timeLeft === 0) {
			finish();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [status, timeLeft]);

	const recordMastery = useCallback((char: string, correct: boolean) => {
		const key = char.toLowerCase();
		if (!HOME_KEYS.includes(key as (typeof HOME_KEYS)[number])) return;
		const m = masteryRef.current;
		if (!m[key]) m[key] = { attempts: 0, correct: 0 };
		m[key].attempts += 1;
		if (correct) m[key].correct += 1;
	}, []);

	const finish = useCallback(() => {
		setStatus("done");
		const total = totalKeystrokesRef.current;
		const correct = correctRef.current;
		const accuracy = total ? Math.round((correct / total) * 100) : 0;
		const burstsCompleted = burstsCompletedRef.current;

		// Scoring (§6): 5 coins/burst + accuracy bonus + early-completion bonus, capped at 60.
		const coinsFromBursts = burstsCompleted * 5;
		const accuracyBonus = Math.round(accuracy / 10) * 2;
		const earlyBonus = burstsCompleted >= 12 ? 10 : 0;
		const coins = Math.min(60, coinsFromBursts + accuracyBonus + earlyBonus);

		onComplete({
			accuracy,
			errors: errorsRef.current,
			burstsCompleted,
			coins,
			masteryDelta: masteryRef.current,
		});
	}, [onComplete]);

	const advance = useCallback(() => {
		burstsCompletedRef.current += 1;
		if (burstIdx + 1 >= bursts.length) {
			finish();
			return;
		}
		setBurstIdx((i) => i + 1);
		setTyped("");
		setCombo((c) => c + 1);
	}, [burstIdx, bursts.length, finish]);

	const handleKey = useCallback(
		(e: KeyboardEvent) => {
			if (status === "done") return;
			if (e.metaKey || e.ctrlKey || e.altKey) return;

			const key = e.key;
			// Backspace disabled — ignored entirely, not even counted.
			if (key === "Backspace") {
				e.preventDefault();
				return;
			}

			if (key.length !== 1) return; // ignore special keys
			e.preventDefault();

			if (status === "idle") {
				startTimeRef.current = Date.now();
				setStatus("typing");
			}

			setPressedChar(key);
			setTimeout(() => setPressedChar(null), 180);

			const expected = burst[typed.length];
			totalKeystrokesRef.current += 1;

			if (key === expected) {
				recordMastery(expected, true);
				correctRef.current += 1;
				setLastState("correct");
				setTyped((t) => t + key);
			} else {
				recordMastery(expected, false);
				errorsRef.current += 1;
				setLastState("wrong");
				// Wrong key does not advance the cursor — flash red and hold.
				setCombo(0);
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[status, burst, typed, recordMastery],
	);

	useEffect(() => {
		if (status === "typing" && burst && typed.length >= burst.length) {
			advance();
		}
	}, [typed, status, burst, advance]);

	useEffect(() => {
		window.addEventListener("keydown", handleKey);
		return () => window.removeEventListener("keydown", handleKey);
	}, [handleKey]);

	const burstProgress = burst.length
		? Math.round((typed.length / burst.length) * 100)
		: 0;

	return (
		<div
			className="flex flex-col items-center gap-6 w-full"
			style={{ width: "100%" }}
		>
			<style>{pulseKeyframes}</style>
			{/* Stats row */}
			<div className="flex items-center gap-6 text-white font-display">
				<div className="text-center">
					<div className="text-3xl tabular-nums font-bold">{timeLeft}s</div>
					<div className="text-xs opacity-70">time left</div>
				</div>
				<div className="text-center">
					<div className="text-3xl font-bold">{burstsCompletedRef.current}</div>
					<div className="text-xs opacity-70">cleared</div>
				</div>
				{combo >= 2 && (
					<div className="text-center">
						<div className="text-3xl font-bold">🔥x{combo}</div>
						<div className="text-xs opacity-70">combo</div>
					</div>
				)}
				<button
					type="button"
					onClick={onExit}
					className="ml-auto text-white/60 hover:text-white text-sm underline underline-offset-2"
				>
					✕ skip
				</button>
			</div>

			{/* Burst prompt */}
			<div className="w-full min-h-[8rem] grid place-items-center rounded-3xl bg-white/70 backdrop-blur border-2 border-white p-6 md:p-8">
				<p className="font-display text-3xl md:text-6xl tracking-wide">
					{burst.split("").map((ch, i) => {
						const isCurrent = i === typed.length;
						return (
							<span
								key={i}
								className="px-1 rounded-md"
								style={{
									backgroundColor: isCurrent
										? "rgb(254 228 92 / 0.4)"
										: "transparent",
									color: "rgb(45 30 21 / 0.85)",
									animation: isCurrent
										? "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
										: "none",
								}}
							>
								{ch}
							</span>
						);
					})}
					{currentChar === null && (
						<span className="text-ink/30 text-2xl">…</span>
					)}
				</p>
			</div>

			{/* Progress bar */}
			<div className="w-full max-w-md bg-white/30 rounded-full h-3 overflow-hidden">
				<div
					className="h-full bg-sunny rounded-full transition-all"
					style={{ width: `${burstProgress}%` }}
				/>
			</div>

			{/* Keyboard */}
			<div className="w-full">
				<Keyboard
					nextChar={currentChar}
					pressedChar={pressedChar}
					state={lastState}
				/>
			</div>
		</div>
	);
}
