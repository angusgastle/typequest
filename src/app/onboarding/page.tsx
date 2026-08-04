"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import { BackgroundBlobs } from "@/components/BackgroundBlobs";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui";
import { equipItem, getSession, setSession } from "@/lib/data";
import type { Session } from "@/lib/types";
import { getItemsBySlot } from "@/lib/items";

const BASES = getItemsBySlot("base");

export default function OnboardingPage() {
	const router = useRouter();
	const [session, setSessionLocal] = useState<Session | null>(null);
	const [ready, setReady] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

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

	const handlePick = async (itemId: string) => {
		setBusy(true);
		setError(null);
		try {
			const updated = await equipItem(session.kidId, "base", itemId);
			setSessionLocal(updated);
			setSession(updated);
			window.dispatchEvent(new Event("tq-session-changed"));
			router.push("/adventure");
		} catch (err: any) {
			setError(err.message || "Could not save your choice");
			setBusy(false);
		}
	};

	return (
		<div className="min-h-screen">
			<NavBar />
			<BackgroundBlobs />
			<main className="mx-auto max-w-2xl px-4 py-6">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					className="text-center mb-8"
				>
					<h1 className="font-display text-4xl font-extrabold mb-2">
						Choose your hero! 🦸
					</h1>
					<p className="font-display text-ink/60">
						Pick a character to start your adventure. You can change it anytime
						in the Character store.
					</p>
				</motion.div>

				{error && (
					<motion.p
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						className="mb-4 text-center font-display text-red-500 font-bold"
					>
						😬 {error}
					</motion.p>
				)}

				<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
					{BASES.map((item, i) => (
						<motion.button
							key={item.id}
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ delay: i * 0.05 }}
							whileTap={{ scale: 0.95 }}
							disabled={busy}
							onClick={() => handlePick(item.id)}
							className="rounded-2xl bg-white/70 backdrop-blur border-2 border-white p-4 flex flex-col items-center hover:border-coral transition-colors disabled:opacity-60"
						>
							<div className="w-20 h-20 relative">
								<Image
									src={item.imageUrl}
									alt={item.name}
									fill
									style={{ objectFit: "contain" }}
								/>
							</div>
							<span className="mt-2 font-display font-bold">{item.name}</span>
						</motion.button>
					))}
				</div>

				<div className="flex justify-center mt-8">
					<Button
						variant="ghost"
						onClick={() => router.push("/adventure")}
						disabled={busy}
					>
						Skip for now →
					</Button>
				</div>
			</main>
		</div>
	);
}
