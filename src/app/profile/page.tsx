"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BackgroundBlobs } from "@/components/BackgroundBlobs";
import { CharacterAvatar } from "@/components/CharacterAvatar";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui";
import {
	changePin,
	getKidStats,
	getSession,
	setSession,
	updateKid,
} from "@/lib/data";
import type { Session } from "@/lib/types";
import {
	getCurrentTierThreshold,
	getNextTierThreshold,
	getStreakMultiplier,
	getTier,
} from "@/lib/utils";

export default function ProfilePage() {
	const router = useRouter();
	const [session, setSess] = useState<Session | null>(null);
	const [ready, setReady] = useState(false);
	const [stats, setStats] = useState({
		testsComplete: 0,
		avgWpm: 0,
		bestWpm: 0,
		avgAccuracy: 0,
	});

	// Edit states
	const [editingName, setEditingName] = useState(false);
	const [newName, setNewName] = useState("");
	const [oldPin, setOldPin] = useState("");
	const [newPin, setNewPin] = useState("");
	const [confirmPin, setConfirmPin] = useState("");
	const [changingPin, setChangingPin] = useState(false);
	const [message, setMessage] = useState<{
		type: "ok" | "err";
		text: string;
	} | null>(null);

	useEffect(() => {
		const s = getSession();
		if (!s) {
			router.replace("/");
			return;
		}
		setSess(s);
		setNewName(s.name);
		setReady(true);

		// Load stats
		getKidStats(s.kidId).then(setStats);
	}, [router]);

	if (!ready || !session) return null;

	const tier = getTier(session.cumulativeScore);
	const nextThreshold = getNextTierThreshold(session.cumulativeScore);
	const currentThreshold = getCurrentTierThreshold(session.cumulativeScore);
	const progressPct =
		nextThreshold !== null
			? Math.round(
					((session.cumulativeScore - currentThreshold) /
						(nextThreshold - currentThreshold)) *
						100,
				)
			: 100;
	const streakMultiplier = getStreakMultiplier(session.streak);

	const handleNameSave = async () => {
		if (!newName.trim()) return;
		try {
			const updated = await updateKid(session.kidId, {
				firstName: newName.trim(),
			});
			setSess(updated);
			setSession(updated);
			window.dispatchEvent(new Event("tq-session-changed"));
			setEditingName(false);
			setMessage({ type: "ok", text: "Name updated!" });
		} catch {
			setMessage({ type: "err", text: "Could not update name" });
		}
	};

	const handlePinChange = async () => {
		if (oldPin.length !== 4 || newPin.length !== 4) {
			setMessage({ type: "err", text: "PIN must be 4 digits" });
			return;
		}
		if (newPin !== confirmPin) {
			setMessage({ type: "err", text: "New PINs don't match" });
			return;
		}
		try {
			await changePin(session.kidId, oldPin, newPin);
			setOldPin("");
			setNewPin("");
			setConfirmPin("");
			setChangingPin(false);
			setMessage({ type: "ok", text: "PIN changed!" });
		} catch (err: any) {
			setMessage({ type: "err", text: err.message || "Could not change PIN" });
		}
	};

	// 7-day streak calendar
	const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
	const todayDate = new Date();
	const streakDays = Array.from({ length: 7 }, (_, i) => {
		const d = new Date(todayDate);
		d.setDate(d.getDate() - (6 - i));
		const dateStr = d.toISOString().slice(0, 10);
		const dayName = days[d.getDay()];
		const isToday = dateStr === todayDate.toISOString().slice(0, 10);
		const completed =
			session.lastQuizDate === dateStr ||
			(isToday && session.lastQuizDate === dateStr);
		return { dateStr, dayName, completed, isToday };
	});

	return (
		<div className="min-h-screen">
			<NavBar />
			<BackgroundBlobs />
			<main className="mx-auto max-w-2xl px-4 py-6">
				{/* Auto-dismiss message */}
				{message && (
					<motion.div
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						className={`mb-4 rounded-2xl p-3 text-center font-display font-bold ${
							message.type === "ok"
								? "bg-teal/20 text-teal"
								: "bg-coral/20 text-coral"
						}`}
					>
						{message.text}
						<button
							className="ml-2 text-ink/40 hover:text-ink"
							onClick={() => setMessage(null)}
						>
							✕
						</button>
					</motion.div>
				)}

				{/* ── Character Section ── */}
				<motion.section
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					className="rounded-[2rem] bg-white/70 backdrop-blur border-2 border-white p-6 mb-4"
				>
					<h2 className="font-display text-xl font-bold mb-4">
						Your Character
					</h2>

					<div className="flex items-center justify-between gap-4">
						<div className="flex justify-center">
							<CharacterAvatar equipped={session.equipped} size="md" />
						</div>
						<Button onClick={() => router.push("/character")}>
							🎒 Customize
						</Button>
					</div>
				</motion.section>

				{/* ── Name & PIN Section ── */}
				<motion.section
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.05 }}
					className="rounded-[2rem] bg-white/70 backdrop-blur border-2 border-white p-6 mb-4"
				>
					<h2 className="font-display text-xl font-bold mb-4">Account</h2>

					{/* Name */}
					<div className="flex items-center gap-3 mb-4">
						<span className="font-display font-bold text-ink/50">Name:</span>
						{editingName ? (
							<div className="flex items-center gap-2 flex-1">
								<input
									value={newName}
									onChange={(e) => setNewName(e.target.value)}
									className="flex-1 rounded-xl border-2 border-white bg-cream/60 px-3 py-2 font-display outline-none focus:border-coral transition"
								/>
								<Button size="sm" onClick={handleNameSave}>
									Save
								</Button>
								<Button
									size="sm"
									variant="ghost"
									onClick={() => {
										setEditingName(false);
										setNewName(session.name);
									}}
								>
									Cancel
								</Button>
							</div>
						) : (
							<>
								<span className="font-display font-bold">{session.name}</span>
								<Button
									size="sm"
									variant="ghost"
									onClick={() => setEditingName(true)}
								>
									✏️ Edit
								</Button>
							</>
						)}
					</div>

					{/* PIN */}
					<div className="flex items-center gap-3">
						<span className="font-display font-bold text-ink/50">PIN:</span>
						<span className="font-display font-bold">••••</span>
						{changingPin ? (
							<div className="flex items-center gap-2 flex-1 flex-wrap">
								<input
									value={oldPin}
									onChange={(e) =>
										setOldPin(e.target.value.replace(/\D/g, "").slice(0, 4))
									}
									placeholder="Old PIN"
									inputMode="numeric"
									className="w-20 rounded-xl border-2 border-white bg-cream/60 px-2 py-2 font-display text-center tracking-widest outline-none focus:border-coral transition"
								/>
								<input
									value={newPin}
									onChange={(e) =>
										setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))
									}
									placeholder="New"
									inputMode="numeric"
									className="w-20 rounded-xl border-2 border-white bg-cream/60 px-2 py-2 font-display text-center tracking-widest outline-none focus:border-coral transition"
								/>
								<input
									value={confirmPin}
									onChange={(e) =>
										setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))
									}
									placeholder="Confirm"
									inputMode="numeric"
									className="w-20 rounded-xl border-2 border-white bg-cream/60 px-2 py-2 font-display text-center tracking-widest outline-none focus:border-coral transition"
								/>
								<Button size="sm" onClick={handlePinChange}>
									Save
								</Button>
								<Button
									size="sm"
									variant="ghost"
									onClick={() => {
										setChangingPin(false);
										setOldPin("");
										setNewPin("");
										setConfirmPin("");
									}}
								>
									Cancel
								</Button>
							</div>
						) : (
							<Button
								size="sm"
								variant="ghost"
								onClick={() => setChangingPin(true)}
							>
								🔒 Change
							</Button>
						)}
					</div>
				</motion.section>

				{/* ── Tier Progress Section ── */}
				<motion.section
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1 }}
					className="rounded-[2rem] bg-white/70 backdrop-blur border-2 border-white p-6 mb-4"
				>
					<h2 className="font-display text-xl font-bold mb-4">Your Tier</h2>

					{/* Tier badge */}
					<div className="flex items-center gap-4 mb-4">
						<div className="text-5xl">{tier.emoji}</div>
						<div>
							<div className="font-display text-2xl font-extrabold">
								{tier.name} {tier.subLevel}
							</div>
							<div className="text-sm text-ink/50 font-display">
								⭐ {session.cumulativeScore.toLocaleString()} points
							</div>
						</div>
					</div>

					{/* Progress bar */}
					{nextThreshold !== null && (
						<div>
							<div className="flex justify-between text-xs text-ink/50 font-display mb-1">
								<span>{currentThreshold.toLocaleString()} pts</span>
								<span>
									Next: {nextThreshold.toLocaleString()} pts ({tier.name}{" "}
									{tier.subLevel + 1 <= 5 ? tier.subLevel + 1 : "1"})
								</span>
							</div>
							<div className="h-4 rounded-full bg-cream overflow-hidden">
								<motion.div
									initial={{ width: 0 }}
									animate={{ width: `${progressPct}%` }}
									transition={{ duration: 0.8, ease: "easeOut" }}
									className="h-full rounded-full bg-gradient-to-r from-coral to-sunny"
								/>
							</div>
							<div className="text-right text-xs text-ink/40 font-display mt-1">
								{progressPct}% to next level
							</div>
						</div>
					)}

					{nextThreshold === null && (
						<p className="font-display text-teal font-bold">
							🎉 You've reached the highest tier!
						</p>
					)}
				</motion.section>

				{/* ── Stats Section ── */}
				<motion.section
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.15 }}
					className="rounded-[2rem] bg-white/70 backdrop-blur border-2 border-white p-6 mb-4"
				>
					<h2 className="font-display text-xl font-bold mb-4">Your Stats</h2>
					<div className="grid grid-cols-2 gap-3">
						<StatCard
							label="📝 Quizzes"
							value={`${stats.testsComplete}`}
							color="bg-grape/20"
						/>
						<StatCard
							label="⌨️ Avg Speed"
							value={`${stats.avgWpm} WPM`}
							color="bg-teal/20"
						/>
						<StatCard
							label="🚀 Best Speed"
							value={`${stats.bestWpm} WPM`}
							color="bg-sunny/20"
						/>
						<StatCard
							label="🎯 Avg Accuracy"
							value={`${stats.avgAccuracy}%`}
							color="bg-coral/20"
						/>
					</div>
				</motion.section>

				{/* ── Streak Section ── */}
				<motion.section
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.2 }}
					className="rounded-[2rem] bg-white/70 backdrop-blur border-2 border-white p-6 mb-4"
				>
					<h2 className="font-display text-xl font-bold mb-2">Daily Streak</h2>

					<div className="flex items-center gap-3 mb-4">
						<span className="text-3xl">🔥</span>
						<div>
							<span className="font-display text-2xl font-extrabold">
								{session.streak}
							</span>
							<span className="font-display text-ink/50 ml-1">
								{session.streak === 1 ? "day" : "days"}
							</span>
						</div>
						<span className="rounded-full bg-sunny/30 px-2 py-0.5 text-xs font-display font-bold">
							{streakMultiplier}x multiplier
						</span>
					</div>

					<p className="text-sm text-ink/50 font-display mb-3">
						Complete a quiz every day to build your streak! Miss a day and
						you'll lose 50 points and your streak resets.
					</p>

					{/* 7-day calendar */}
					<div className="flex gap-2 justify-center">
						{streakDays.map((d) => (
							<div
								key={d.dateStr}
								className={`flex flex-col items-center gap-1 rounded-xl p-2 min-w-[3.5rem] ${
									d.isToday
										? "bg-coral/10 border-2 border-coral/30"
										: "bg-cream/60"
								}`}
							>
								<span className="text-xs font-display font-bold text-ink/50">
									{d.dayName}
								</span>
								<span className="text-lg">
									{d.completed ? "✅" : d.isToday ? "📝" : "⬜"}
								</span>
							</div>
						))}
					</div>
				</motion.section>

				{/* ── Back button ── */}
				<div className="flex justify-center py-4">
					<Button variant="secondary" onClick={() => router.push("/adventure")}>
						🧭 Back to Adventures
					</Button>
				</div>
			</main>
		</div>
	);
}

function StatCard({
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
			<div className="font-display font-bold text-2xl">{value}</div>
			<div className="font-display text-sm text-ink/60">{label}</div>
		</div>
	);
}
