"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BackgroundBlobs } from "@/components/BackgroundBlobs";
import { CharacterAvatar } from "@/components/CharacterAvatar";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui";
import { buyItem, equipItem, getSession, setSession } from "@/lib/data";
import type { Item, Session } from "@/lib/types";
import { getItemsBySlot, ITEMS } from "@/lib/items";

const SLOTS = ["base", "hat", "outfit", "weapon"] as const;

export default function CharacterPage() {
	const router = useRouter();
	const [session, setSessionLocal] = useState<Session | null>(null);
	const [ready, setReady] = useState(false);
	const [activeSlot, setActiveSlot] = useState<string>("base");
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
		setSessionLocal(s);
		setReady(true);
	}, [router]);

	if (!ready || !session) return null;

	const handleBuyItem = async (item: Item) => {
		try {
			const updated = await buyItem(session.kidId, item.id);
			setSessionLocal(updated);
			setSession(updated);
			window.dispatchEvent(new Event("tq-session-changed"));
			setMessage({ type: "ok", text: `Bought ${item.name}!` });
		} catch (err: any) {
			setMessage({ type: "err", text: err.message || "Could not buy item" });
		}
	};

	const handleEquipItem = async (item: Item, slot: string) => {
		try {
			const updated = await equipItem(session.kidId, slot, item.id);
			setSessionLocal(updated);
			setSession(updated);
			window.dispatchEvent(new Event("tq-session-changed"));
			setMessage({ type: "ok", text: `Equipped ${item.name}!` });
		} catch (err: any) {
			setMessage({ type: "err", text: err.message || "Could not equip item" });
		}
	};

	const handleUnequip = async (slot: string) => {
		try {
			const updated = await equipItem(session.kidId, slot, null);
			setSessionLocal(updated);
			setSession(updated);
			window.dispatchEvent(new Event("tq-session-changed"));
			setMessage({ type: "ok", text: "Unequipped!" });
		} catch (err: any) {
			setMessage({ type: "err", text: err.message || "Could not unequip" });
		}
	};

	const itemsInSlot = getItemsBySlot(activeSlot);

	return (
		<div className="min-h-screen">
			<NavBar />
			<BackgroundBlobs />
			<main className="mx-auto max-w-4xl px-4 py-6">
				{/* Message */}
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

				{/* Header */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					className="text-center mb-8"
				>
					<h1 className="font-display text-4xl font-extrabold mb-2">
						🎒 My Character
					</h1>
					<p className="font-display text-ink/60">
						Customize your avatar with your coins!
					</p>
				</motion.div>

				{/* Coins balance */}
				<motion.div
					initial={{ opacity: 0, scale: 0.8 }}
					animate={{ opacity: 1, scale: 1 }}
					className="flex justify-center mb-8"
				>
					<div className="rounded-full bg-sunny px-4 py-2 font-display font-bold flex items-center gap-2">
						<span>🪙</span>
						<span>{session.coins}</span>
					</div>
				</motion.div>

				<div className="grid lg:grid-cols-3 gap-6">
					{/* Preview */}
					<motion.section
						initial={{ opacity: 0, x: -20 }}
						animate={{ opacity: 1, x: 0 }}
						className="rounded-[2rem] bg-white/70 backdrop-blur border-2 border-white p-6 flex flex-col items-center justify-center min-h-64"
					>
						<h2 className="font-display text-xl font-bold mb-4">Preview</h2>
						<CharacterAvatar equipped={session.equipped} size="lg" />
						<div className="mt-4 text-xs text-ink/50 font-display text-center">
							Equip items to see them appear on your character!
						</div>
					</motion.section>

					{/* Store */}
					<motion.section
						initial={{ opacity: 0, x: 20 }}
						animate={{ opacity: 1, x: 0 }}
						className="lg:col-span-2 rounded-[2rem] bg-white/70 backdrop-blur border-2 border-white p-6"
					>
						<h2 className="font-display text-xl font-bold mb-4">Store</h2>

						{/* Slot tabs */}
						<div className="flex gap-2 mb-4 flex-wrap">
							{SLOTS.map((slot) => (
								<button
									key={slot}
									onClick={() => setActiveSlot(slot)}
									className={`rounded-xl px-3 py-2 font-display font-bold transition-all ${
										activeSlot === slot
											? "bg-coral text-white"
											: "bg-cream text-ink hover:bg-cream/80"
									}`}
								>
									{slot === "base"
										? "Base"
										: slot === "hat"
											? "🎩 Hats"
											: slot === "outfit"
												? "👕 Outfits"
												: "⚔️ Weapons"}
								</button>
							))}
						</div>

						{/* Items grid */}
						<div className="grid grid-cols-2 gap-3">
							{itemsInSlot.map((item) => {
								const isOwned =
									session.ownedItems.includes(item.id) || item.cost === 0;
								const isEquipped = session.equipped[item.slot] === item.id;
								return (
									<motion.div
										key={item.id}
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										className={`rounded-xl border-2 p-3 transition-all ${
											isEquipped
												? "bg-sunny/30 border-sunny"
												: isOwned
													? "bg-cream/60 border-white"
													: "bg-ink/5 border-white/50 opacity-75"
										}`}
									>
										<div className="flex justify-center mb-2">
											<div className="w-16 h-16 relative">
												<Image
													src={item.imageUrl}
													alt={item.name}
													fill
													style={{ objectFit: "contain" }}
												/>
											</div>
										</div>
										<div className="text-sm font-display font-bold mb-2">
											{item.name}
										</div>
										{isOwned ? (
											isEquipped ? (
												item.slot === "base" ? (
													<div className="rounded-xl px-4 py-2 text-sm font-display font-bold bg-teal/20 text-teal text-center">
														✓ Equipped
													</div>
												) : (
													<Button
														size="sm"
														variant="secondary"
														onClick={() => handleUnequip(item.slot)}
														className="w-full"
													>
														✓ Equipped
													</Button>
												)
											) : (
												<Button
													size="sm"
													onClick={() => handleEquipItem(item, item.slot)}
													className="w-full"
												>
													Equip
												</Button>
											)
										) : (
											<Button
												size="sm"
												variant={
													session.coins >= item.cost ? "primary" : "ghost"
												}
												disabled={session.coins < item.cost}
												onClick={() => handleBuyItem(item)}
												className="w-full"
											>
												{item.cost} 🪙
											</Button>
										)}
									</motion.div>
								);
							})}
						</div>
					</motion.section>
				</div>

				{/* Back button */}
				<div className="flex justify-center py-4 mt-6">
					<Button variant="secondary" onClick={() => router.push("/adventure")}>
						🗺️ Back to Adventures
					</Button>
				</div>
			</main>
		</div>
	);
}
