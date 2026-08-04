import type {
	Kid,
	LeaderboardRow,
	Session,
	TestContent,
	TestResult,
} from "./types";
import { getTier, today, yesterday } from "./utils";

/**
 * Data access layer.
 *
 * - When Supabase env vars are present, calls go through the API routes which
 *   read/write Supabase.
 * - Otherwise we run in DEMO MODE using localStorage so the app is fully
 *   interactive without any backend configured.
 */

const SESSION_KEY = "tq_session";
const KIDS_KEY = "tq_kids";
const TESTS_KEY = "tq_tests";
const ADVENTURES_KEY = "tq_adventures";

export const isDemo = !(
	process.env.NEXT_PUBLIC_SUPABASE_URL &&
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------
export function getSession(): Session | null {
	if (typeof window === "undefined") return null;
	const raw = localStorage.getItem(SESSION_KEY);
	if (!raw) return null;
	const parsed = JSON.parse(raw);
	// Backward compatibility — fill new fields with defaults for old sessions
	return {
		kidId: parsed.kidId,
		name: parsed.name,
		level: parsed.level,
		cumulativeScore: parsed.cumulativeScore,
		coins: parsed.coins ?? 0,
		equipped: parsed.equipped ?? {
			base: "base-boy",
			hat: null,
			outfit: null,
			weapon: null,
		},
		ownedItems: parsed.ownedItems ?? ["base-boy", "base-girl"],
		streak: parsed.streak ?? 0,
		lastQuizDate: parsed.lastQuizDate ?? null,
	};
}

export function setSession(s: Session | null): void {
	if (typeof window === "undefined") return;
	if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
	else localStorage.removeItem(SESSION_KEY);
}

// ---------------------------------------------------------------------------
// Login: name + PIN
// ---------------------------------------------------------------------------
export async function login(
	name: string,
	pin: string,
): Promise<{ session: Session; isNew: boolean }> {
	if (isDemo) return demoLogin(name, pin);
	const res = await fetch("/api/login", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ name, pin }),
	});
	if (!res.ok) {
		const { error } = await res.json().catch(() => ({}));
		throw new Error(error || "Login failed");
	}
	const data = await res.json();
	return {
		session: {
			kidId: data.kidId,
			name: data.name,
			level: data.level,
			cumulativeScore: data.cumulativeScore,
			coins: data.coins ?? 0,
			equipped: data.equipped ?? {
				base: "base-boy",
				hat: null,
				outfit: null,
				weapon: null,
			},
			ownedItems: data.ownedItems ?? ["base-boy", "base-girl"],
			streak: data.streak ?? 0,
			lastQuizDate: data.lastQuizDate ?? null,
		},
		isNew: Boolean(data.isNew),
	};
}

// ---------------------------------------------------------------------------
// Get or generate an adventure (with pool reuse if available)
// ---------------------------------------------------------------------------
export async function generateTest(
	kidId: string,
	level: number,
	kidName?: string,
): Promise<TestContent> {
	if (isDemo) return demoGenerateTest(kidId, level, kidName);
	const res = await fetch("/api/get-adventure", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ kidId, level, kidName }),
	});
	if (!res.ok) throw new Error("Could not generate adventure");
	return res.json();
}

// ---------------------------------------------------------------------------
// Submit a completed test
// ---------------------------------------------------------------------------
export async function submitTest(
	kidId: string,
	content: TestContent,
	result: TestResult,
): Promise<{ kid: Session; rank: number | null }> {
	if (isDemo) return demoSubmit(kidId, content, result);
	const res = await fetch("/api/submit-test", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ kidId, content, result }),
	});
	if (!res.ok) throw new Error("Could not save test");
	const data = await res.json();
	return {
		kid: {
			kidId: data.kid.kidId,
			name: data.kid.name,
			level: data.kid.level,
			cumulativeScore: data.kid.cumulativeScore,
			coins: data.kid.coins ?? 0,
			equipped: data.kid.equipped ?? {
				base: "base-boy",
				hat: null,
				outfit: null,
				weapon: null,
			},
			ownedItems: data.kid.ownedItems ?? ["base-boy", "base-girl"],
			streak: data.kid.streak ?? 0,
			lastQuizDate: data.kid.lastQuizDate ?? null,
		},
		rank: data.rank ?? null,
	};
}

// ---------------------------------------------------------------------------
// Update kid profile (name, coins, equipped, owned)
// ---------------------------------------------------------------------------
export async function updateKid(
	kidId: string,
	updates: {
		firstName?: string;
		coins?: number;
		equipped?: Record<string, string | null>;
		ownedItems?: string[];
	},
): Promise<Session> {
	if (isDemo) return demoUpdateKid(kidId, updates);
	const res = await fetch("/api/update-kid", {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ kidId, ...updates }),
	});
	if (!res.ok) throw new Error("Could not update profile");
	const data = await res.json();
	return {
		kidId: data.kid.kidId,
		name: data.kid.name,
		level: data.kid.level,
		cumulativeScore: data.kid.cumulativeScore,
		coins: data.kid.coins ?? 0,
		equipped: data.kid.equipped ?? {
			base: "base-boy",
			hat: null,
			outfit: null,
			weapon: null,
		},
		ownedItems: data.kid.ownedItems ?? ["base-boy", "base-girl"],
		streak: data.kid.streak ?? 0,
		lastQuizDate: data.kid.lastQuizDate ?? null,
	};
}

// ---------------------------------------------------------------------------
// Change PIN
// ---------------------------------------------------------------------------
export async function changePin(
	kidId: string,
	oldPin: string,
	newPin: string,
): Promise<void> {
	if (isDemo) return demoChangePin(kidId, oldPin, newPin);
	const res = await fetch("/api/change-pin", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ kidId, oldPin, newPin }),
	});
	if (!res.ok) {
		const { error } = await res.json().catch(() => ({}));
		throw new Error(error || "Could not change PIN");
	}
}

// ---------------------------------------------------------------------------
// Get kid stats (for profile page)
// ---------------------------------------------------------------------------
export async function getKidStats(kidId: string): Promise<{
	testsComplete: number;
	avgWpm: number;
	bestWpm: number;
	avgAccuracy: number;
}> {
	if (isDemo) return demoGetKidStats(kidId);
	const res = await fetch(`/api/kid-stats?kidId=${kidId}`);
	if (!res.ok)
		return { testsComplete: 0, avgWpm: 0, bestWpm: 0, avgAccuracy: 0 };
	return res.json();
}

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------
export async function getLeaderboard(
	scope: "week" | "all",
): Promise<LeaderboardRow[]> {
	if (isDemo) return demoLeaderboard(scope);
	const res = await fetch(`/api/leaderboard?scope=${scope}`);
	if (!res.ok) return [];
	return res.json();
}

// ---------------------------------------------------------------------------
// Buy item (cosmetics store)
// ---------------------------------------------------------------------------
export async function buyItem(kidId: string, itemId: string): Promise<Session> {
	if (isDemo) return demoBuyItem(kidId, itemId);
	const res = await fetch("/api/buy-item", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ kidId, itemId }),
	});
	if (!res.ok) {
		const { error } = await res.json().catch(() => ({}));
		throw new Error(error || "Could not buy item");
	}
	const data = await res.json();
	return {
		kidId: data.kid.kidId,
		name: data.kid.name,
		level: data.kid.level,
		cumulativeScore: data.kid.cumulativeScore,
		coins: data.kid.coins ?? 0,
		equipped: data.kid.equipped ?? {
			base: "base-boy",
			hat: null,
			outfit: null,
			weapon: null,
		},
		ownedItems: data.kid.ownedItems ?? ["base-boy", "base-girl"],
		streak: data.kid.streak ?? 0,
		lastQuizDate: data.kid.lastQuizDate ?? null,
	};
}

// ---------------------------------------------------------------------------
// Equip item (cosmetics store)
// ---------------------------------------------------------------------------
export async function equipItem(
	kidId: string,
	slot: string,
	itemId: string | null,
): Promise<Session> {
	if (isDemo) return demoEquipItem(kidId, slot, itemId);
	const res = await fetch("/api/equip-item", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ kidId, slot, itemId }),
	});
	if (!res.ok) {
		const { error } = await res.json().catch(() => ({}));
		throw new Error(error || "Could not equip item");
	}
	const data = await res.json();
	return {
		kidId: data.kid.kidId,
		name: data.kid.name,
		level: data.kid.level,
		cumulativeScore: data.kid.cumulativeScore,
		coins: data.kid.coins ?? 0,
		equipped: data.kid.equipped ?? {
			base: "base-boy",
			hat: null,
			outfit: null,
			weapon: null,
		},
		ownedItems: data.kid.ownedItems ?? ["base-boy", "base-girl"],
		streak: data.kid.streak ?? 0,
		lastQuizDate: data.kid.lastQuizDate ?? null,
	};
}

// ===========================================================================
// DEMO MODE (localStorage) — no backend required
// ===========================================================================
interface DemoKid extends Kid {
	pin: string;
	seen_adventure_ids?: string[];
}
interface DemoTest {
	id: string;
	kid_id: string;
	test_content: TestContent;
	difficulty: number;
	errors: number;
	score: number;
	time_to_complete: number;
	backspaces: number;
	created: string;
}
interface DemoAdventure {
	id: string;
	theme: string;
	title: string;
	prompt: string;
	difficulty: number;
}

function loadKids(): Record<string, DemoKid> {
	if (typeof window === "undefined") return {};
	const raw = localStorage.getItem(KIDS_KEY) || "{}";
	const kids = JSON.parse(raw);
	// Backward compatibility — fill new fields with defaults
	for (const id of Object.keys(kids)) {
		const k = kids[id];
		if (k.coins === undefined) k.coins = 0;
		if (k.equipped === undefined)
			k.equipped = { base: "base-boy", hat: null, outfit: null, weapon: null };
		if (k.owned_items === undefined) k.owned_items = ["base-boy", "base-girl"];
		if (k.streak === undefined) k.streak = 0;
		if (k.last_quiz_date === undefined) k.last_quiz_date = null;
		if (k.seen_adventure_ids === undefined) k.seen_adventure_ids = [];
	}
	return kids;
}
function saveKids(kids: Record<string, DemoKid>) {
	if (typeof window !== "undefined")
		localStorage.setItem(KIDS_KEY, JSON.stringify(kids));
}
function loadTests(): DemoTest[] {
	if (typeof window === "undefined") return [];
	const raw = localStorage.getItem(TESTS_KEY) || "[]";
	const tests = JSON.parse(raw);
	// Backward compatibility — fill new fields
	for (const t of tests) {
		if (t.backspaces === undefined) t.backspaces = 0;
	}
	return tests;
}
function saveTests(tests: DemoTest[]) {
	if (typeof window !== "undefined")
		localStorage.setItem(TESTS_KEY, JSON.stringify(tests));
}
function loadAdventures(): DemoAdventure[] {
	if (typeof window === "undefined") return [];
	const raw = localStorage.getItem(ADVENTURES_KEY) || "[]";
	return JSON.parse(raw);
}
function saveAdventures(adventures: DemoAdventure[]) {
	if (typeof window !== "undefined")
		localStorage.setItem(ADVENTURES_KEY, JSON.stringify(adventures));
}

function uid() {
	return `id-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function demoLogin(
	name: string,
	pin: string,
): { session: Session; isNew: boolean } {
	const kids = loadKids();
	const existing = Object.values(kids).find(
		(k) => k.first_name.toLowerCase() === name.trim().toLowerCase(),
	);
	let kid: DemoKid;
	let isNew = false;
	if (existing) {
		if (existing.pin !== pin) {
			throw new Error("Wrong PIN! Ask a grown-up for help.");
		}
		kid = existing;
	} else {
		isNew = true;
		kid = {
			id: uid(),
			first_name: name.trim(),
			last_name: null,
			nickname: null,
			age: null,
			email: null,
			wpm: 0,
			tests_complete: 0,
			level: 1,
			cumulative_score: 0,
			coins: 0,
			equipped: { base: "base-boy", hat: null, outfit: null, weapon: null },
			owned_items: ["base-boy", "base-girl"],
			streak: 0,
			last_quiz_date: null,
			pin,
			created: new Date().toISOString(),
			last_updated: new Date().toISOString(),
		};
		kids[kid.id] = kid;
		saveKids(kids);
	}
	const tier = getTier(kid.cumulative_score);
	const session: Session = {
		kidId: kid.id,
		name: kid.first_name,
		level: tier.level,
		cumulativeScore: kid.cumulative_score,
		coins: kid.coins,
		equipped: kid.equipped,
		ownedItems: kid.owned_items,
		streak: kid.streak,
		lastQuizDate: kid.last_quiz_date,
	};
	setSession(session);
	return { session, isNew };
}

function demoSubmit(
	kidId: string,
	content: TestContent,
	result: TestResult,
): Promise<{ kid: Session; rank: number | null }> {
	const kids = loadKids();
	const kid = kids[kidId];
	if (!kid) throw new Error("Kid not found");

	// Evaluate streak
	const todayStr = today();
	const yesterdayStr = yesterday();
	const lastDate = kid.last_quiz_date;
	let newStreak = kid.streak;
	let penalty = 0;

	if (lastDate && lastDate !== todayStr && lastDate !== yesterdayStr) {
		// Streak broken — missed at least one day
		penalty = 50;
		newStreak = 0;
	}

	if (lastDate !== todayStr) {
		// First quiz today — increment streak
		newStreak += 1;
	}

	// Save test record
	const tests = loadTests();
	tests.push({
		id: uid(),
		kid_id: kidId,
		test_content: content,
		difficulty: kid.level,
		errors: result.errors,
		score: result.score,
		time_to_complete: result.timeToComplete,
		backspaces: result.backspaces,
		created: new Date().toISOString(),
	});
	saveTests(tests);

	// Update kid stats
	kid.tests_complete += 1;
	const newCumulativeScore = Math.max(
		0,
		kid.cumulative_score + result.score - penalty,
	);
	kid.cumulative_score = newCumulativeScore;
	const coinsEarned = Math.max(1, Math.round(result.score / 10));
	kid.coins += coinsEarned;
	kid.wpm = Math.round(
		(kid.wpm * (kid.tests_complete - 1) + result.wpm) / kid.tests_complete,
	);
	// Level is now derived from cumulative score via tier system
	const tier = getTier(newCumulativeScore);
	kid.level = tier.level;
	kid.streak = newStreak;
	kid.last_quiz_date = todayStr;
	kid.last_updated = new Date().toISOString();
	kids[kidId] = kid;
	saveKids(kids);

	const session: Session = {
		kidId: kid.id,
		name: kid.first_name,
		level: tier.level,
		cumulativeScore: newCumulativeScore,
		coins: kid.coins,
		equipped: kid.equipped,
		ownedItems: kid.owned_items,
		streak: newStreak,
		lastQuizDate: todayStr,
	};
	setSession(session);
	return Promise.resolve({ kid: session, rank: null });
}

function demoUpdateKid(
	kidId: string,
	updates: {
		firstName?: string;
		coins?: number;
		equipped?: Record<string, string | null>;
		ownedItems?: string[];
	},
): Session {
	const kids = loadKids();
	const kid = kids[kidId];
	if (!kid) throw new Error("Kid not found");

	if (updates.firstName !== undefined) kid.first_name = updates.firstName;
	if (updates.coins !== undefined) kid.coins = updates.coins;
	if (updates.equipped !== undefined) kid.equipped = updates.equipped;
	if (updates.ownedItems !== undefined) kid.owned_items = updates.ownedItems;
	kid.last_updated = new Date().toISOString();
	kids[kidId] = kid;
	saveKids(kids);

	const currentSession = getSession();
	const session: Session = {
		kidId: kid.id,
		name: kid.first_name,
		level: currentSession?.level ?? 1,
		cumulativeScore: currentSession?.cumulativeScore ?? 0,
		coins: kid.coins,
		equipped: kid.equipped,
		ownedItems: kid.owned_items,
		streak: currentSession?.streak ?? 0,
		lastQuizDate: currentSession?.lastQuizDate ?? null,
	};
	setSession(session);
	return session;
}

function demoChangePin(kidId: string, oldPin: string, newPin: string): void {
	const kids = loadKids();
	const kid = kids[kidId];
	if (!kid) throw new Error("Kid not found");
	if (kid.pin !== oldPin) throw new Error("Wrong PIN!");
	kid.pin = newPin;
	kid.last_updated = new Date().toISOString();
	kids[kidId] = kid;
	saveKids(kids);
}

function demoGetKidStats(kidId: string): {
	testsComplete: number;
	avgWpm: number;
	bestWpm: number;
	avgAccuracy: number;
} {
	const kids = loadKids();
	const kid = kids[kidId];
	if (!kid) return { testsComplete: 0, avgWpm: 0, bestWpm: 0, avgAccuracy: 0 };

	const tests = loadTests().filter((t) => t.kid_id === kidId);
	if (tests.length === 0) {
		return {
			testsComplete: kid.tests_complete,
			avgWpm: 0,
			bestWpm: 0,
			avgAccuracy: 0,
		};
	}

	let totalWpm = 0;
	let bestWpm = 0;
	let totalAccuracy = 0;

	for (const t of tests) {
		const promptChars = t.test_content.prompt.length;
		const wpm = t.time_to_complete
			? Math.round(promptChars / 5 / (t.time_to_complete / 60))
			: 0;
		const errors = t.errors;
		const accuracy = promptChars
			? Math.round(((promptChars - errors) / promptChars) * 100)
			: 0;
		totalWpm += wpm;
		if (wpm > bestWpm) bestWpm = wpm;
		totalAccuracy += accuracy;
	}

	return {
		testsComplete: tests.length,
		avgWpm: Math.round(totalWpm / tests.length),
		bestWpm,
		avgAccuracy: Math.round(totalAccuracy / tests.length),
	};
}

function demoLeaderboard(scope: "week" | "all"): LeaderboardRow[] {
	const kids = loadKids();
	const tests = loadTests();
	const since = scope === "week" ? Date.now() - 7 * 24 * 60 * 60 * 1000 : 0;
	const stats: Record<
		string,
		{
			wpm: number;
			score: number;
			count: number;
			errors: number;
			chars: number;
		}
	> = {};
	for (const t of tests) {
		if (new Date(t.created).getTime() < since) continue;
		const promptChars = t.test_content.prompt.length;
		if (!stats[t.kid_id]) {
			stats[t.kid_id] = {
				wpm: 0,
				score: 0,
				count: 0,
				errors: 0,
				chars: 0,
			};
		}
		const s = stats[t.kid_id];
		s.wpm += t.time_to_complete
			? Math.round(promptChars / 5 / (t.time_to_complete / 60))
			: 0;
		s.score += t.score;
		s.count += 1;
		s.errors += t.errors;
		s.chars += promptChars;
	}
	const rows: LeaderboardRow[] = [];
	for (const kid of Object.values(kids)) {
		const s = stats[kid.id];
		const wpm = s ? Math.round(s.wpm / s.count) : 0;
		const score = s ? s.score : 0;
		const errors = s ? s.errors : 0;
		const chars = s ? s.chars : 1;
		const accuracy = Math.max(0, Math.round(((chars - errors) / chars) * 100));
		rows.push({
			kid_id: kid.id,
			nickname: kid.nickname || kid.first_name,
			first_name: kid.first_name,
			equipped: kid.equipped ?? null,
			wpm,
			accuracy,
			score,
			rank: 0,
		});
	}
	rows.sort((a, b) => b.score - a.score);
	rows.forEach((r, i) => {
		r.rank = i + 1;
	});
	// Seed a fun demo leaderboard so the page isn't empty.
	if (rows.length === 0) {
		return [];
	}
	return rows;
}

function demoGenerateTest(
	kidId: string,
	level: number,
	kidName?: string,
): Promise<TestContent> {
	const kids = loadKids();
	const kid = kids[kidId];
	if (!kid) throw new Error("Kid not found");

	// Import difficultyForLevel
	const { difficultyForLevel } = require("./generate-test");
	const difficulty = difficultyForLevel(level);

	// Load adventure pool
	const adventures = loadAdventures();

	// Find unseen adventures matching difficulty
	const seenIds = kid.seen_adventure_ids ?? [];
	const available = adventures.filter(
		(a) => a.difficulty === difficulty && !seenIds.includes(a.id),
	);

	// If we found one, use it
	if (available.length > 0) {
		const chosen = available[Math.floor(Math.random() * available.length)];
		kid.seen_adventure_ids = [...(kid.seen_adventure_ids ?? []), chosen.id];
		kids[kidId] = kid;
		saveKids(kids);
		return Promise.resolve({
			prompt: chosen.prompt,
			theme: chosen.theme,
			title: chosen.title,
		});
	}

	// No unseen adventure — generate and add to pool
	const {
		aiGenerateTest,
		localGenerateTest,
		isAiConfigured,
	} = require("./generate-test");
	return (
		isAiConfigured()
			? aiGenerateTest(level, kidName)
			: localGenerateTest(level, kidName)
	).then((generated: TestContent) => {
		const newAdventure: DemoAdventure = {
			id: uid(),
			theme: generated.theme,
			title: generated.title,
			prompt: generated.prompt,
			difficulty,
		};
		adventures.push(newAdventure);
		saveAdventures(adventures);

		kid.seen_adventure_ids = [
			...(kid.seen_adventure_ids ?? []),
			newAdventure.id,
		];
		kids[kidId] = kid;
		saveKids(kids);

		return generated;
	});
}

function demoBuyItem(kidId: string, itemId: string): Session {
	const { ITEMS, getItem } = require("./items");
	const kids = loadKids();
	const kid = kids[kidId];
	if (!kid) throw new Error("Kid not found");

	const item = getItem(itemId);
	if (!item) throw new Error("Item not found");
	if (item.cost > 0 && kid.coins < item.cost)
		throw new Error("Not enough coins");

	// Deduct coins and add to owned items
	if (item.cost > 0) kid.coins -= item.cost;
	if (!kid.owned_items.includes(itemId)) {
		kid.owned_items.push(itemId);
	}
	kid.last_updated = new Date().toISOString();
	kids[kidId] = kid;
	saveKids(kids);

	const currentSession = getSession();
	const session: Session = {
		kidId: kid.id,
		name: kid.first_name,
		level: currentSession?.level ?? 1,
		cumulativeScore: currentSession?.cumulativeScore ?? 0,
		coins: kid.coins,
		equipped: kid.equipped,
		ownedItems: kid.owned_items,
		streak: currentSession?.streak ?? 0,
		lastQuizDate: currentSession?.lastQuizDate ?? null,
	};
	setSession(session);
	return session;
}

function demoEquipItem(
	kidId: string,
	slot: string,
	itemId: string | null,
): Session {
	const { getItem } = require("./items");
	const kids = loadKids();
	const kid = kids[kidId];
	if (!kid) throw new Error("Kid not found");

	// The base slot must always have a body — it can be swapped, never cleared.
	if (slot === "base" && itemId === null) {
		throw new Error("Base cannot be removed");
	}

	// Validate ownership
	if (itemId !== null) {
		const item = getItem(itemId);
		if (!item) throw new Error("Item not found");
		if (item.slot !== slot) throw new Error("Item slot mismatch");
		// Free items (cost 0) are always ownable, regardless of owned_items.
		if (item.cost !== 0 && !kid.owned_items.includes(itemId))
			throw new Error("Item not owned");
	}

	kid.equipped[slot] = itemId;
	kid.last_updated = new Date().toISOString();
	kids[kidId] = kid;
	saveKids(kids);

	const currentSession = getSession();
	const session: Session = {
		kidId: kid.id,
		name: kid.first_name,
		level: currentSession?.level ?? 1,
		cumulativeScore: currentSession?.cumulativeScore ?? 0,
		coins: kid.coins,
		equipped: kid.equipped,
		ownedItems: kid.owned_items,
		streak: currentSession?.streak ?? 0,
		lastQuizDate: currentSession?.lastQuizDate ?? null,
	};
	setSession(session);
	return session;
}
