import type {
	Kid,
	LeaderboardRow,
	Session,
	TestContent,
	TestResult,
} from "./types";
import { avatarFor, getTier, today, yesterday } from "./utils";

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
		avatar: parsed.avatar ?? null,
		avatarColor: parsed.avatarColor ?? "#ff6b6b",
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
export async function login(name: string, pin: string): Promise<Session> {
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
		kidId: data.kidId,
		name: data.name,
		level: data.level,
		cumulativeScore: data.cumulativeScore,
		avatar: data.avatar ?? null,
		avatarColor: data.avatarColor ?? "#ff6b6b",
		streak: data.streak ?? 0,
		lastQuizDate: data.lastQuizDate ?? null,
	};
}

// ---------------------------------------------------------------------------
// Generate a test (AI adventure)
// ---------------------------------------------------------------------------
export async function generateTest(level: number): Promise<TestContent> {
	const res = await fetch("/api/generate-test", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ level }),
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
			avatar: data.kid.avatar ?? null,
			avatarColor: data.kid.avatarColor ?? "#ff6b6b",
			streak: data.kid.streak ?? 0,
			lastQuizDate: data.kid.lastQuizDate ?? null,
		},
		rank: data.rank ?? null,
	};
}

// ---------------------------------------------------------------------------
// Update kid profile (avatar, color, name)
// ---------------------------------------------------------------------------
export async function updateKid(
	kidId: string,
	updates: { avatar?: string; avatarColor?: string; firstName?: string },
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
		avatar: data.kid.avatar ?? null,
		avatarColor: data.kid.avatarColor ?? "#ff6b6b",
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

// ===========================================================================
// DEMO MODE (localStorage) — no backend required
// ===========================================================================
interface DemoKid extends Kid {
	pin: string;
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

function loadKids(): Record<string, DemoKid> {
	if (typeof window === "undefined") return {};
	const raw = localStorage.getItem(KIDS_KEY) || "{}";
	const kids = JSON.parse(raw);
	// Backward compatibility — fill new fields with defaults
	for (const id of Object.keys(kids)) {
		const k = kids[id];
		if (k.avatar === undefined) k.avatar = null;
		if (k.avatar_color === undefined) k.avatar_color = "#ff6b6b";
		if (k.streak === undefined) k.streak = 0;
		if (k.last_quiz_date === undefined) k.last_quiz_date = null;
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

function uid() {
	return `id-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function demoLogin(name: string, pin: string): Session {
	const kids = loadKids();
	const existing = Object.values(kids).find(
		(k) => k.first_name.toLowerCase() === name.trim().toLowerCase(),
	);
	let kid: DemoKid;
	if (existing) {
		if (existing.pin !== pin) {
			throw new Error("Wrong PIN! Ask a grown-up for help.");
		}
		kid = existing;
	} else {
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
			avatar: null,
			avatar_color: "#ff6b6b",
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
		avatar: kid.avatar,
		avatarColor: kid.avatar_color,
		streak: kid.streak,
		lastQuizDate: kid.last_quiz_date,
	};
	setSession(session);
	return session;
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
		avatar: kid.avatar,
		avatarColor: kid.avatar_color,
		streak: newStreak,
		lastQuizDate: todayStr,
	};
	setSession(session);
	return Promise.resolve({ kid: session, rank: null });
}

function demoUpdateKid(
	kidId: string,
	updates: { avatar?: string; avatarColor?: string; firstName?: string },
): Session {
	const kids = loadKids();
	const kid = kids[kidId];
	if (!kid) throw new Error("Kid not found");

	if (updates.avatar !== undefined) kid.avatar = updates.avatar;
	if (updates.avatarColor !== undefined) kid.avatar_color = updates.avatarColor;
	if (updates.firstName !== undefined) kid.first_name = updates.firstName;
	kid.last_updated = new Date().toISOString();
	kids[kidId] = kid;
	saveKids(kids);

	const currentSession = getSession();
	const session: Session = {
		kidId: kid.id,
		name: kid.first_name,
		level: currentSession?.level ?? 1,
		cumulativeScore: currentSession?.cumulativeScore ?? 0,
		avatar: kid.avatar,
		avatarColor: kid.avatar_color,
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
			avatar: kid.avatar || avatarFor(kid.first_name),
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
