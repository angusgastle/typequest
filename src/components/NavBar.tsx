"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CharacterAvatar } from "@/components/CharacterAvatar";
import { getSession, setSession } from "@/lib/data";
import type { Session } from "@/lib/types";
import { cn, getTier } from "@/lib/utils";

const links = [
	{ href: "/adventure", label: "Adventure", emoji: "🗺️" },
	{ href: "/leaderboard", label: "Leaderboard", emoji: "🏆" },
	{ href: "/character", label: "Character", emoji: "🎒" },
	{ href: "/profile", label: "Profile", emoji: "👤" },
];

export function NavBar() {
	const pathname = usePathname();
	const [session, setSession] = useState<Session | null>(null);
	const [mounted, setMounted] = useState(false);
	const [menuOpen, setMenuOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	// Close menu on outside click
	useEffect(() => {
		if (!menuOpen) return;
		const handler = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				setMenuOpen(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [menuOpen]);

	useEffect(() => {
		setMounted(true);
		const update = () => setSession(getSession());
		update();
		window.addEventListener("storage", update);
		window.addEventListener("tq-session-changed", update);
		return () => {
			window.removeEventListener("storage", update);
			window.removeEventListener("tq-session-changed", update);
		};
	}, []);

	const logout = () => {
		setSession(null);
		window.dispatchEvent(new Event("tq-session-changed"));
		setMenuOpen(false);
	};

	if (!mounted) return <nav className="h-20" />;

	const tier = session ? getTier(session.cumulativeScore) : null;

	return (
		<nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b-2 border-white shadow-sm">
			<div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 gap-2">
				{/* Logo */}
				<Link href="/" className="flex items-center gap-2 shrink-0">
					<motion.span
						className="text-3xl"
						animate={{ rotate: [0, -8, 8, 0] }}
						transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1 }}
					>
						🦉
					</motion.span>
					<span className="font-display text-xl md:text-2xl font-extrabold tracking-tight">
						Type<span className="text-coral">Quest</span>
					</span>
				</Link>

				{/* Center nav links */}
				<div className="hidden md:flex items-center gap-1">
					{links.map((l) => {
						const active = pathname === l.href;
						return (
							<Link
								key={l.href}
								href={l.href}
								className={cn(
									"px-4 py-2 rounded-2xl font-display font-bold transition-colors",
									active
										? "bg-coral text-white"
										: "text-ink/70 hover:bg-sunny/40",
								)}
							>
								<span className="mr-1">{l.emoji}</span>
								{l.label}
							</Link>
						);
					})}
				</div>

				{/* Score + Avatar */}
				<div className="flex items-center gap-2 md:gap-3">
					{session && (
						<motion.div
							key={session.cumulativeScore}
							initial={{ scale: 1.3 }}
							animate={{ scale: 1 }}
							className="flex items-center gap-1 rounded-full bg-sunny px-3 py-1.5 font-display font-bold"
						>
							<span>⭐</span>
							<span className="tabular-nums">
								{session.cumulativeScore.toLocaleString()}
							</span>
						</motion.div>
					)}
					{session ? (
						<div className="relative" ref={menuRef}>
							<button
								onClick={() => setMenuOpen((o) => !o)}
								className="flex items-center gap-2 rounded-full bg-white border-2 border-coral/30 pl-1 pr-3 py-1 hover:border-coral transition-colors"
							>
								<CharacterAvatar equipped={session.equipped} size="sm" />
								<span className="hidden sm:inline font-display font-bold text-sm">
									{session.name} ·{" "}
									{tier ? `${tier.emoji} ${tier.name} ${tier.subLevel}` : ""}
								</span>
							</button>
							{menuOpen && (
								<div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white border-2 border-white shadow-lg overflow-hidden z-50">
									<Link
										href="/profile"
										onClick={() => setMenuOpen(false)}
										className="flex items-center gap-2 px-4 py-2.5 font-display font-bold text-sm hover:bg-sunny/30 transition-colors"
									>
										<span>👤</span> Profile
									</Link>
									<button
										onClick={logout}
										className="flex items-center gap-2 w-full px-4 py-2.5 font-display font-bold text-sm text-red-500 hover:bg-red-50 transition-colors"
									>
										<span>👋</span> Log Out
									</button>
								</div>
							)}
						</div>
					) : (
						<Link
							href="/"
							className="rounded-full bg-coral px-4 py-2 font-display font-bold text-white"
						>
							Sign In
						</Link>
					)}
				</div>
			</div>

			{/* Mobile nav */}
			<div className="flex md:hidden border-t-2 border-white px-2 py-1.5 gap-1">
				{links.map((l) => {
					const active = pathname === l.href;
					return (
						<Link
							key={l.href}
							href={l.href}
							className={cn(
								"flex-1 text-center py-1.5 rounded-xl font-display font-bold text-sm",
								active ? "bg-coral text-white" : "text-ink/70",
							)}
						>
							{l.emoji} {l.label}
						</Link>
					);
				})}
			</div>
		</nav>
	);
}
