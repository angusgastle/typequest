"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Confetti } from "./Confetti";
import { RoadblockDrill, type DrillResult } from "./RoadblockDrill";
import type { KeyMastery } from "@/lib/types";
import { generateBursts } from "@/lib/roadblock";

type Stage = "intro" | "drill" | "cleared";

interface RoadblockOverlayProps {
	level: number;
	mastery: KeyMastery;
	onComplete: (coinsEarned: number, masteryDelta: KeyMastery) => void;
}

const COUNTDOWN = ["3", "2", "1", "GO!"];

export function RoadblockOverlay({
	level,
	mastery,
	onComplete,
}: RoadblockOverlayProps) {
	const [stage, setStage] = useState<Stage>("intro");
	const [count, setCount] = useState(0);
	const [result, setResult] = useState<DrillResult | null>(null);

	const bursts = useMemo(
		() => generateBursts({ count: 15, mastery }),
		[mastery],
	);

	// Intro countdown — advances 0→3 across the 4 COUNTDOWN values.
	useEffect(() => {
		if (stage !== "intro") return;
		if (count >= COUNTDOWN.length) {
			setStage("drill");
			return;
		}
		const id = setTimeout(() => setCount((c) => c + 1), 700);
		return () => clearTimeout(id);
	}, [stage, count]);

	const handleDrillComplete = (res: DrillResult) => {
		setResult(res);
		setStage("cleared");
	};

	const handleSkip = () => {
		onComplete(0, {});
	};

	// After the cleared celebration, hand off.
	useEffect(() => {
		if (stage !== "cleared") return;
		const id = setTimeout(() => {
			onComplete(result?.coins ?? 0, result?.masteryDelta ?? {});
		}, 2500);
		return () => clearTimeout(id);
	}, [stage, result, onComplete]);

	return (
		<div className="fixed inset-0 z-[200] overflow-hidden">
			{/* Barrier panels — slam down from above on intro, re-open on cleared */}
			<AnimatePresence>
				{stage !== "cleared" && (
					<>
						<motion.div
							className="absolute top-0 left-0 w-1/2 h-full bg-coral"
							initial={{ y: "-100vh" }}
							animate={{ y: 0 }}
							exit={{ y: "-100vh" }}
							transition={{ type: "spring", stiffness: 120, damping: 14 }}
						/>
						<motion.div
							className="absolute top-0 right-0 w-1/2 h-full bg-ink"
							initial={{ y: "-100vh" }}
							animate={{ y: 0 }}
							exit={{ y: "-100vh" }}
							transition={{ type: "spring", stiffness: 120, damping: 14 }}
						/>
						{/* Diagonal sunny stripe between the panels */}
						<motion.div
							className="absolute top-0 h-full bg-sunny"
							style={{
								left: "calc(50% - 6px)",
								width: "12px",
								transform: "skewX(-8deg)",
							}}
							initial={{ y: "-100vh" }}
							animate={{ y: 0 }}
							exit={{ y: "-100vh" }}
							transition={{ type: "spring", stiffness: 120, damping: 14 }}
						/>
					</>
				)}
			</AnimatePresence>

			{/* Screen-shake wrapper for the intro headline */}
			<motion.div
				className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
				animate={
					stage === "intro"
						? { x: [0, -8, 8, -6, 6, 0], y: [0, 4, -4, 0] }
						: { x: 0, y: 0 }
				}
				transition={{ duration: 0.4, repeat: stage === "intro" ? 2 : 0 }}
			>
				{stage === "intro" && (
					<>
						<motion.h1
							initial={{ scale: 3, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
							className="font-display text-6xl md:text-8xl font-extrabold text-white drop-shadow-lg"
						>
							🚧 OH NO, NOT A ROADBLOCK!
						</motion.h1>
						<div className="h-24 mt-6 flex items-center justify-center">
							<AnimatePresence mode="wait">
								<motion.span
									key={count}
									initial={{ scale: [3, 1], opacity: 0 }}
									animate={{ opacity: 1, scale: 1 }}
									exit={{ opacity: 0, scale: 0.5 }}
									transition={{ duration: 0.5 }}
									className="font-display text-7xl md:text-9xl font-extrabold text-sunny"
								>
									{count < COUNTDOWN.length ? COUNTDOWN[count] : ""}
								</motion.span>
							</AnimatePresence>
						</div>
					</>
				)}

				{stage === "drill" && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						className="absolute inset-0 bg-gradient-to-b from-coral/80 to-ink/80 p-6 flex flex-col items-center justify-center"
					>
						<div className="absolute top-4 left-6 text-white/80 text-sm flex items-center gap-2">
							<span className="text-xl">🚧</span>
							<span className="font-display font-bold">
								Level {level} Roadblock
							</span>
						</div>
						<RoadblockDrill
							bursts={bursts}
							onComplete={handleDrillComplete}
							onExit={handleSkip}
						/>
					</motion.div>
				)}

				{stage === "cleared" && (
					<motion.div
						initial={{ scale: 0, rotate: -10 }}
						animate={{ scale: 1, rotate: 0 }}
						transition={{ type: "spring", stiffness: 200 }}
						className="font-display text-6xl md:text-8xl font-extrabold text-white text-center"
					>
						🚧 BARRIER CLEARED!
						<div className="mt-4 text-4xl text-sunny">
							+{result?.coins ?? 0} 🪙
						</div>
					</motion.div>
				)}
			</motion.div>

			{stage === "cleared" && <Confetti />}
		</div>
	);
}
