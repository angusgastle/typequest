"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BackgroundBlobs } from "@/components/BackgroundBlobs";
import { Button } from "@/components/ui";
import { isDemo, login, setSession } from "@/lib/data";
import { toTitleCase } from "@/lib/utils";

export default function LoginPage() {
	const router = useRouter();
	const [name, setName] = useState("");
	const [pin, setPin] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const submit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		if (!name.trim()) return setError("Type your name to begin!");
		if (pin.length !== 4) return setError("Your PIN is 4 numbers.");
		setLoading(true);
		try {
			const session = await login(name.trim(), pin);
			setSession(session);
			window.dispatchEvent(new Event("tq-session-changed"));
			router.push("/adventure");
		} catch (err: any) {
			setError(err.message || "Something went wrong.");
			setLoading(false);
		}
	};

	return (
		<div className="relative flex min-h-screen items-center justify-center p-4">
			<BackgroundBlobs />
			<motion.div
				initial={{ scale: 0.9, y: 30, opacity: 0 }}
				animate={{ scale: 1, y: 0, opacity: 1 }}
				transition={{ type: "spring", stiffness: 200, damping: 20 }}
				className="w-full max-w-md"
			>
				<div className="rounded-[2.5rem] bg-white/80 backdrop-blur border-2 border-white shadow-2xl p-8">
					<motion.div
						animate={{ rotate: [0, -6, 6, 0] }}
						transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
						className="text-6xl text-center mb-2"
					>
						🦉
					</motion.div>
					<h1 className="text-center font-display text-4xl font-extrabold">
						Type<span className="text-coral">Quest</span>
					</h1>
					<p className="text-center text-ink/60 mt-1 font-display">
						Adventure awaits, brave typer!
					</p>

					<form onSubmit={submit} className="mt-8 space-y-4">
						<div>
							<label className="block font-display font-bold mb-1.5">
								What's your name?
							</label>
							<input
								value={name}
								onChange={(e) => setName(e.target.value)}
								onBlur={() => setName(toTitleCase(name))}
								placeholder="Olive"
								autoComplete="off"
								className="w-full rounded-2xl border-2 border-white bg-cream/60 px-4 py-3 font-display text-lg outline-none focus:border-coral focus:ring-4 focus:ring-coral/20 transition"
							/>
						</div>
						<div>
							<label className="block font-display font-bold mb-1.5">
								Your secret 4-digit PIN
							</label>
							<input
								value={pin}
								onChange={(e) =>
									setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
								}
								inputMode="numeric"
								placeholder="••••"
								className="w-full rounded-2xl border-2 border-white bg-cream/60 px-4 py-3 font-display text-2xl tracking-[0.5em] outline-none focus:border-coral focus:ring-4 focus:ring-coral/20 transition"
							/>
						</div>

						{error && (
							<motion.p
								initial={{ opacity: 0, y: -5 }}
								animate={{ opacity: 1, y: 0 }}
								className="text-center font-display text-red-500 font-bold"
							>
								😬 {error}
							</motion.p>
						)}

						<Button
							type="submit"
							size="lg"
							disabled={loading}
							className="w-full"
						>
							{loading ? "Loading…" : "Start Adventure →"}
						</Button>
					</form>

					<p className="mt-6 text-center text-sm text-ink/50 font-display">
						New here? Your PIN makes your account. {isDemo && "(Demo mode)"}
					</p>
				</div>
			</motion.div>
		</div>
	);
}
