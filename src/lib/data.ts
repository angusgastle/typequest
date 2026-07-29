import type {
	Kid,
	LeaderboardRow,
	TestContent,
	TestResult,
	Session,
} from "./types";
import { avatarFor } from "./utils";

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
	return raw ? JSON.parse(raw) : null;
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
	const { kidId, level, cumulativeScore } = await res.json();
	return { kidId, name, level, cumulativeScore };
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
	created: string;
}

function loadKids(): Record<string, DemoKid> {
	if (typeof window === "undefined") return {};
	return JSON.parse(localStorage.getItem(KIDS_KEY) || "{}");
}
function saveKids(kids: Record<string, DemoKid>) {
	if (typeof window !== "undefined")
		localStorage.setItem(KIDS_KEY, JSON.stringify(kids));
}
function loadTests(): DemoTest[] {
	if (typeof window === "undefined") return [];
	return JSON.parse(localStorage.getItem(TESTS_KEY) || "[]");
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
			pin,
			created: new Date().toISOString(),
			last_updated: new Date().toISOString(),
		};
		kids[kid.id] = kid;
		saveKids(kids);
	}
	return {
		kidId: kid.id,
		name: kid.first_name,
		level: kid.level,
		cumulativeScore: kid.cumulative_score,
	};
}

async function demoSubmit(
	kidId: string,
	content: TestContent,
	result: TestResult,
): Promise<{ kid: Session; rank: number | null }> {
	const kids = loadKids();
	const kid = kids[kidId];
	if (!kid) throw new Error("Kid not found");
	const tests = loadTests();
	tests.push({
		id: uid(),
		kid_id: kidId,
		test_content: content,
		difficulty: kid.level,
		errors: result.errors,
		score: result.score,
		time_to_complete: result.timeToComplete,
		created: new Date().toISOString(),
	});
	saveTests(tests);
	kid.tests_complete += 1;
	kid.cumulative_score += result.score;
	kid.wpm = Math.round(
		(kid.wpm * (kid.tests_complete - 1) + result.wpm) / kid.tests_complete,
	);
	if (result.accuracy >= 90) kid.level += 1;
	kid.last_updated = new Date().toISOString();
	kids[kidId] = kid;
	saveKids(kids);
	const session: Session = {
		kidId: kid.id,
		name: kid.first_name,
		level: kid.level,
		cumulativeScore: kid.cumulative_score,
	};
	setSession(session);
	return { kid: session, rank: null };
}

function demoLeaderboard(scope: "week" | "all"): LeaderboardRow[] {
	const kids = loadKids();
	const tests = loadTests();
	const since = scope === "week" ? Date.now() - 7 * 24 * 60 * 60 * 1000 : 0;
	const stats: Record<
		string,
		{ wpm: number; score: number; count: number; errors: number; chars: number }
	> = {};
	for (const t of tests) {
		if (new Date(t.created).getTime() < since) continue;
		const promptChars = t.test_content.prompt.length;
		if (!stats[t.kid_id]) {
			stats[t.kid_id] = { wpm: 0, score: 0, count: 0, errors: 0, chars: 0 };
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
			avatar: avatarFor(kid.first_name),
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
