// ---------------------------------------------------------------------------
// Roadblock — home-row drill logic
// ---------------------------------------------------------------------------
// A "roadblock" is a surprise interrupt between adventures that drops the kid
// into a 60-second pure home-row drill with backspace disabled. It is
// self-retiring: kids who have demonstrably mastered the home row stop seeing
// it. This module is pure (client-side) logic with no React, so it is trivially
// testable.
// ---------------------------------------------------------------------------

import type { Session, KeyMastery } from "@/lib/types";

/** The 8 home-row keys, lowercase. */
export const HOME_KEYS = ["a", "s", "d", "f", "j", "k", "l", ";"] as const;

// Split home keys by hand — used for same-hand alternation bursts.
const LEFT_HAND = ["a", "s", "d", "f"];
const RIGHT_HAND = ["j", "k", "l", ";"];

/** A simple seeded RNG so tests can be deterministic. */
function makeRng(seed: number): () => number {
	let s = seed >>> 0;
	return () => {
		// xorshift32
		s ^= s << 13;
		s ^= s >>> 17;
		s ^= s << 5;
		return ((s >>> 0) % 1_000_000) / 1_000_000;
	};
}

/**
 * Decide whether a roadblock should fire right now.
 *
 * Weighting by absolute level (derived from cumulative score):
 *   Level 1-5:  60%
 *   Level 6-15: 35%
 *   Level 16-25: 15%
 *   Level 26-30: 5%
 *
 * Gating:
 *  - Never fires twice in one session-day (localStorage `tq_last_roadblock`).
 *  - Mastery skip: if >=6 of 8 home keys each have attempts >= 20 and average
 *    accuracy >= 90%, the kid has mastered the home row — force `false`.
 */
export function shouldFireRoadblock(
	session: Pick<Session, "level" | "kidId">,
	mastery: KeyMastery = {},
): boolean {
	// Session-day gate — avoid hammering the same kid in one day.
	try {
		const today = new Date().toISOString().slice(0, 10);
		const last = window.localStorage.getItem("tq_last_roadblock");
		if (last === today) return false;
	} catch {
		// localStorage may be unavailable — proceed with weighted chance.
	}

	if (hasMasteredHomeRow(mastery)) return false;

	const level = session.level;
	let weight: number;
	if (level <= 5) weight = 0.6;
	else if (level <= 15) weight = 0.35;
	else if (level <= 25) weight = 0.15;
	else weight = 0.05;

	return Math.random() < weight;
}

/** Mark a roadblock as fired today (used after firing). */
export function markRoadblockFired(): void {
	try {
		window.localStorage.setItem(
			"tq_last_roadblock",
			new Date().toISOString().slice(0, 10),
		);
	} catch {
		// ignore
	}
}

/** True when the kid has demonstrably mastered the home row. */
export function hasMasteredHomeRow(mastery: KeyMastery): boolean {
	let mastered = 0;
	for (const key of HOME_KEYS) {
		const m = mastery[key];
		if (!m || m.attempts < 20) continue;
		const accuracy = m.correct / Math.max(1, m.attempts);
		if (accuracy >= 0.9) mastered++;
	}
	return mastered >= 6;
}

// ---------------------------------------------------------------------------
// Burst generation
// ---------------------------------------------------------------------------

/** Pick an index from `items` weighted by the corresponding weight. */
function weightedPick(weights: number[], rng: () => number): number {
	const total = weights.reduce((sum, w) => sum + Math.max(0, w), 0);
	if (total <= 0) return Math.floor(rng() * weights.length);
	let r = rng() * total;
	for (let i = 0; i < weights.length; i++) {
		r -= Math.max(0, weights[i]);
		if (r < 0) return i;
	}
	return weights.length - 1;
}

/** Accuracy for a key (0-1), defaults to 1 (mastered) when no data. */
function accuracyFor(mastery: KeyMastery, key: string): number {
	const m = mastery[key];
	if (!m || m.attempts === 0) return 1;
	return m.correct / m.attempts;
}

/** Burst: the same key repeated, weighted toward weaker keys. */
function singleKeyBurst(
	mastery: KeyMastery,
	rng: () => number,
	length = 4,
): string {
	const weights = HOME_KEYS.map((k) => 1 - accuracyFor(mastery, k));
	const idx = weightedPick(weights, rng);
	return HOME_KEYS[idx].repeat(length);
}

/** Burst: alternate between two keys on the same hand (e.g. "asas"). */
function sameHandBurst(
	mastery: KeyMastery,
	rng: () => number,
	length = 4,
): string {
	const hand = rng() < 0.5 ? LEFT_HAND : RIGHT_HAND;
	const weights = hand.map((k) => 1 - accuracyFor(mastery, k));
	const i = weightedPick(weights, rng);
	let j = weightedPick(weights, rng);
	if (j === i) j = (j + 1) % hand.length;
	let out = "";
	for (let n = 0; n < length; n++) {
		out += n % 2 === 0 ? hand[i] : hand[j];
	}
	return out;
}

/** Burst: cross-hand alternation (e.g. "fjfj" or "jfjf"). */
function crossHandBurst(
	mastery: KeyMastery,
	rng: () => number,
	length = 4,
): string {
	const leftWeights = LEFT_HAND.map((k) => 1 - accuracyFor(mastery, k));
	const rightWeights = RIGHT_HAND.map((k) => 1 - accuracyFor(mastery, k));
	const l = LEFT_HAND[weightedPick(leftWeights, rng)];
	const r = RIGHT_HAND[weightedPick(rightWeights, rng)];
	const startLeft = rng() < 0.5;
	let out = "";
	for (let n = 0; n < length; n++) {
		out += (n % 2 === 0) === startLeft ? l : r;
	}
	return out;
}

export interface GenerateBurstsOptions {
	count: number;
	mastery?: KeyMastery;
	rng?: () => number;
	seed?: number;
}

/**
 * Build a burst queue. The drill eases kids in:
 *   Phase 1 (first 3 bursts): single-key repeats (muscle memory on one key)
 *   Phase 2 (next 4): same-hand alternations
 *   Phase 3 (rest): cross-hand + combos
 */
export function generateBursts(opts: GenerateBurstsOptions): string[] {
	const { count, mastery = {}, seed = 42 } = opts;
	const rng = opts.rng ?? makeRng(seed);
	const bursts: string[] = [];

	for (let i = 0; i < count; i++) {
		if (i < 3) {
			bursts.push(singleKeyBurst(mastery, rng));
		} else if (i < 7) {
			bursts.push(sameHandBurst(mastery, rng));
		} else {
			bursts.push(crossHandBurst(mastery, rng));
		}
	}
	return bursts;
}
