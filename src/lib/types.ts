export interface Kid {
	id: string;
	first_name: string;
	last_name: string | null;
	nickname: string | null;
	age: number | null;
	email: string | null;
	wpm: number;
	tests_complete: number;
	level: number;
	cumulative_score: number;
	coins: number;
	equipped: Record<string, string | null>;
	owned_items: string[];
	streak: number;
	last_quiz_date: string | null;
	created: string;
	last_updated: string;
}

export interface TestRecord {
	id: string;
	kid_id: string;
	test_content: TestContent;
	difficulty: number;
	errors: number;
	score: number;
	time_to_complete: number; // seconds
	created: string;
	last_updated: string;
}

export interface TestContent {
	prompt: string; // the text the kid types
	theme: string; // adventure theme name
	title: string; // adventure title
}

export interface TestResult {
	accuracy: number; // 0-100
	wpm: number;
	errors: number;
	score: number;
	timeToComplete: number;
	backspaces: number;
}

export interface LeaderboardRow {
	kid_id: string;
	nickname: string;
	first_name: string;
	equipped: Record<string, string | null> | null;
	wpm: number;
	accuracy: number;
	score: number;
	rank: number;
}

export interface Session {
	kidId: string;
	name: string;
	level: number;
	cumulativeScore: number;
	coins: number;
	equipped: Record<string, string | null>;
	ownedItems: string[];
	streak: number;
	lastQuizDate: string | null;
}

export interface Adventure {
	id: string;
	theme: string;
	title: string;
	prompt: string;
	difficulty: number;
}

/** Per-key typing mastery, keyed by lowercase key label (e.g. "a", ";"). */
export type KeyMastery = Record<string, { attempts: number; correct: number }>;

export type Slot = "base" | "hat" | "outfit" | "weapon";

export interface Item {
	id: string;
	slot: Slot;
	name: string;
	cost: number;
	imageUrl: string;
}
