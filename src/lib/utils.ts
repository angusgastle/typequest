import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// ---------------------------------------------------------------------------
// Avatars
// ---------------------------------------------------------------------------

export const AVATARS = [
	"🦊",
	"🐢",
	"🦉",
	"🐙",
	"🦝",
	"🐝",
	"🦋",
	"🦄",
	"🐞",
	"🦔",
	"🦡",
	"🦏",
	"🦌",
	"🐯",
	"🦁",
	"🐼",
	"🐸",
	"🐧",
	"🐬",
	"🦈",
	"🐉",
	"🦅",
	"🦜",
	"🐹",
	"🐰",
	"🦩",
	"🦚",
	"🐨",
	"🦙",
	"🐑",
];

export function avatarFor(seed: string): string {
	let hash = 0;
	for (let i = 0; i < seed.length; i++) {
		hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
	}
	return AVATARS[hash % AVATARS.length];
}

// ---------------------------------------------------------------------------
// Avatar colors
// ---------------------------------------------------------------------------

export const AVATAR_COLORS = [
	{ name: "Coral", value: "#ff6b6b" },
	{ name: "Teal", value: "#4ecdc4" },
	{ name: "Sunny", value: "#ffd93d" },
	{ name: "Grape", value: "#6c5ce7" },
	{ name: "Leaf", value: "#6bcb77" },
	{ name: "Sky", value: "#74c7ec" },
	{ name: "Pink", value: "#ff5a8a" },
	{ name: "Orange", value: "#ff8e3c" },
	{ name: "Purple", value: "#a78bfa" },
	{ name: "Mint", value: "#a8edba" },
	{ name: "Gold", value: "#f9ca24" },
	{ name: "Cream", value: "#ffeaa7" },
];

// ---------------------------------------------------------------------------
// Tier system (Epic Books–style: Bronze → Silver → Gold → Diamond → Emerald → Platinum)
// ---------------------------------------------------------------------------

export interface TierInfo {
	emoji: string;
	name: string;
	subLevel: number;
	level: number; // absolute level 1-30, used for timer/difficulty scaling
}

const TIER_THRESHOLDS: { emoji: string; name: string; thresholds: number[] }[] =
	[
		{ emoji: "🥉", name: "Bronze", thresholds: [0, 100, 250, 500, 1_000] },
		{
			emoji: "🥈",
			name: "Silver",
			thresholds: [1_500, 2_250, 3_000, 4_000, 5_000],
		},
		{
			emoji: "🥇",
			name: "Gold",
			thresholds: [6_500, 8_500, 11_000, 14_000, 18_000],
		},
		{
			emoji: "💎",
			name: "Diamond",
			thresholds: [23_000, 29_000, 36_000, 44_000, 55_000],
		},
		{
			emoji: "🟢",
			name: "Emerald",
			thresholds: [68_000, 85_000, 105_000, 130_000, 160_000],
		},
		{
			emoji: "🔷",
			name: "Platinum",
			thresholds: [200_000, 250_000, 310_000, 380_000, 500_000],
		},
	];

export function getTier(score: number): TierInfo {
	let tierIndex = 0;
	let subLevel = 1;
	let level = 1;

	for (let i = 0; i < TIER_THRESHOLDS.length; i++) {
		const tier = TIER_THRESHOLDS[i];
		for (let j = 0; j < tier.thresholds.length; j++) {
			if (score >= tier.thresholds[j]) {
				tierIndex = i;
				subLevel = j + 1;
				level = i * 5 + j + 1; // 1-30
			}
		}
	}

	const tier = TIER_THRESHOLDS[tierIndex];
	return {
		emoji: tier.emoji,
		name: tier.name,
		subLevel,
		level,
	};
}

/** Get the threshold score needed to reach the next sub-level. */
export function getNextTierThreshold(score: number): number | null {
	const current = getTier(score);
	const nextLevel = current.level + 1;
	if (nextLevel > 30) return null; // maxed out
	const tierIndex = Math.floor((nextLevel - 1) / 5);
	const subIndex = (nextLevel - 1) % 5;
	return TIER_THRESHOLDS[tierIndex].thresholds[subIndex];
}

/** Get the threshold score of the current sub-level (for progress bar calc). */
export function getCurrentTierThreshold(score: number): number {
	const current = getTier(score);
	const tierIndex = Math.floor((current.level - 1) / 5);
	const subIndex = (current.level - 1) % 5;
	return TIER_THRESHOLDS[tierIndex].thresholds[subIndex];
}

// ---------------------------------------------------------------------------
// Streak multiplier
// ---------------------------------------------------------------------------

export function getStreakMultiplier(streak: number): number {
	if (streak <= 1) return 1.0;
	if (streak <= 3) return 1.1;
	if (streak <= 6) return 1.2;
	return 1.5; // 7+
}

// ---------------------------------------------------------------------------
// Misc helpers
// ---------------------------------------------------------------------------

export function initials(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "?";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formatScore(score: number): string {
	return score.toLocaleString("en-US");
}

/** Get yesterday's date as YYYY-MM-DD string. */
export function yesterday(): string {
	const d = new Date();
	d.setDate(d.getDate() - 1);
	return d.toISOString().slice(0, 10);
}

/** Get today's date as YYYY-MM-DD string. */
export function today(): string {
	return new Date().toISOString().slice(0, 10);
}
