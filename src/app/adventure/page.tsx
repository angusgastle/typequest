"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BackgroundBlobs } from "@/components/BackgroundBlobs";
import { Confetti } from "@/components/Confetti";
import { Keyboard } from "@/components/Keyboard";
import { NavBar } from "@/components/NavBar";
import { TypingTest } from "@/components/TypingTest";
import { Button } from "@/components/ui";
import { generateTest, getSession, setSession, submitTest } from "@/lib/data";
import type { Session, TestContent, TestResult } from "@/lib/types";
import { getTier } from "@/lib/utils";

type Phase = "intro" | "generating" | "playing" | "result";

export default function AdventurePage() {
	const router = useRouter();
	const [session, setSess] = useState<Session | null>(null);
	const [ready, setReady] = useState(false);
	const [phase, setPhase] = useState<Phase>("intro");
	const [content, setContent] = useState<TestContent | null>(null);
	const [result, setResult] = useState<TestResult | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const s = getSession();
		if (!s) {
			router.replace("/");
			return;
		}
		setSess(s);
		setReady(true);
	}, [router]);

	const startTest = async () => {
		if (!session) return;
		setPhase("generating");
		setError(null);
		try {
			const c = await generateTest(session.kidId, session.level, session.name);
			setContent(c);
			setPhase("playing");
		} catch {
			setError("Could not start your adventure. Try again!");
			setPhase("intro");
		}
	};

	const handleComplete = async (r: TestResult) => {
		if (!session || !content) return;
		setResult(r);
		setPhase("result");
		try {
			const { kid } = await submitTest(session.kidId, content, r);
			setSession(kid);
			window.dispatchEvent(new Event("tq-session-changed"));
		} catch {
			// results still shown locally
		}
	};

	if (!ready) return null;

	return (
		<div className="min-h-screen">
			<NavBar />
			<BackgroundBlobs />
			<main className="mx-auto max-w-5xl px-4 py-6">
				<AnimatePresence mode="wait">
					{phase === "intro" && (
						<motion.div
							key="intro"
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
						>
							<Intro onGo={startTest} session={session} error={error} />
						</motion.div>
					)}
					{phase === "generating" && (
						<motion.div
							key="gen"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							className="grid place-items-center py-32"
						>
							<motion.div
								animate={{ rotate: 360 }}
								transition={{
									duration: 1.5,
									repeat: Infinity,
									ease: "linear",
								}}
								className="text-6xl mb-4"
							>
								🗺️
							</motion.div>
							<p className="font-display text-xl font-bold text-grape">
								Charting your adventure…
							</p>
						</motion.div>
					)}
					{phase === "playing" && content && (
						<motion.div
							key="play"
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
						>
							<TypingTest
								content={content}
								level={session ? session.level : 1}
								streak={session ? session.streak : 0}
								onComplete={handleComplete}
								onExit={() => setPhase("intro")}
							/>
						</motion.div>
					)}
					{phase === "result" && result && (
						<ResultScreen
							key="res"
							result={result}
							onAgain={() => {
								setResult(null);
								startTest();
							}}
							onHome={() => setPhase("intro")}
						/>
					)}
				</AnimatePresence>
			</main>
		</div>
	);
}

function Intro({
	onGo,
	session,
	error,
}: {
	onGo: () => void;
	session: Session | null;
	error: string | null;
}) {
	const tier = session ? getTier(session.cumulativeScore) : null;
	return (
		<div className="grid place-items-center py-16 text-center">
			<motion.div
				initial={{ scale: 0.8, opacity: 0 }}
				animate={{ scale: 1, opacity: 1 }}
				transition={{ type: "spring", stiffness: 200 }}
				className="text-7xl mb-4"
			>
				🧭
			</motion.div>
			<h1 className="font-display text-4xl md:text-5xl font-extrabold">
				Start Your Next Adventure
			</h1>
			<p className="mt-3 max-w-md font-display text-lg text-ink/60">
				Hi {session?.name}! Each adventure is a fresh, AI-generated story. Type
				it out before the timer runs out to earn stars and level up!
			</p>
			<div className="mt-4 flex gap-2 text-sm font-display font-bold">
				<span className="rounded-full bg-grape/20 px-3 py-1">
					{tier ? `${tier.emoji} ${tier.name} ${tier.subLevel}` : "Level 1"}
				</span>
				<span className="rounded-full bg-sunny/40 px-3 py-1">
					⭐ {session?.cumulativeScore.toLocaleString()} points
				</span>
			</div>
			{error && (
				<p className="mt-4 font-display text-red-500 font-bold">😬 {error}</p>
			)}
			<Button size="lg" className="mt-8" onClick={onGo}>
				🧭 Generate My Adventure
			</Button>
			<p className="mt-6 text-sm text-ink/40 font-display">
				Tip: keep your fingers on the home row (A S D F J K L ;)
			</p>

			{/* Keyboard preview — decorative, shows finger-color guides */}
			<div className="mt-8 w-full max-w-3xl mx-auto opacity-70 pointer-events-none select-none">
				<p className="text-xs text-ink/40 font-display mb-2">
					Your keyboard guide
				</p>
				<Keyboard nextChar={null} pressedChar={null} state={null} />
			</div>
		</div>
	);
}

function ResultScreen({
	result,
	onAgain,
	onHome,
}: {
	result: TestResult;
	onAgain: () => void;
	onHome: () => void;
}) {
	return (
		<>
			<Confetti />
			<motion.div
				initial={{ scale: 0.8, opacity: 0 }}
				animate={{ scale: 1, opacity: 1 }}
				transition={{ type: "spring", stiffness: 200 }}
				className="mx-auto max-w-lg text-center"
			>
				<h1 className="font-display text-5xl font-extrabold">
					{result.score > 0 ? "🎉 You did it!" : "Nice try!"}
				</h1>
				<div className="mt-6 grid grid-cols-3 gap-3">
					<Stat
						label="⭐ Score"
						value={`+${result.score}`}
						color="bg-sunny/40"
					/>
					<Stat
						label="⌨️ Speed"
						value={`${result.wpm} WPM`}
						color="bg-teal/30"
					/>
					<Stat
						label="🎯 Accuracy"
						value={`${result.accuracy}%`}
						color="bg-grape/30"
					/>
					<Stat
						label="❌ Errors"
						value={`${result.errors}`}
						color="bg-coral/30"
					/>
					<Stat
						label="⏱️ Time"
						value={`${result.timeToComplete}s`}
						color="bg-sky/30"
					/>
					<Stat
						label="⌫ Backspaces"
						value={`${result.backspaces}`}
						color="bg-ink/10"
					/>
				</div>
				<div className="mt-8 flex justify-center gap-3">
					<Button variant="secondary" onClick={onHome}>
						Back Home
					</Button>
					<Button onClick={onAgain}>Next Adventure →</Button>
				</div>
			</motion.div>
		</>
	);
}

function Stat({
	label,
	value,
	color,
}: {
	label: string;
	value: string;
	color: string;
}) {
	return (
		<div className={`rounded-2xl ${color} p-4`}>
			<div className="font-display font-bold text-3xl">{value}</div>
			<div className="font-display text-sm text-ink/60">{label}</div>
		</div>
	);
}
