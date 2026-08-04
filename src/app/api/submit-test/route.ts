import { NextResponse } from "next/server";
import { difficultyForLevel } from "@/lib/generate-test";
import { getServerSupabase, hasSupabase } from "@/lib/supabase-server";
import type { TestContent, TestResult } from "@/lib/types";
import { getTier, today, yesterday } from "@/lib/utils";

export async function POST(req: Request) {
	const body = await req.json().catch(() => ({}));
	const kidId: string = body.kidId;
	const content: TestContent = body.content;
	const result: TestResult = body.result;
	if (!kidId || !content || !result) {
		return NextResponse.json({ error: "Missing data" }, { status: 400 });
	}

	const supabase = getServerSupabase();
	if (!hasSupabase() || !supabase) {
		return NextResponse.json({ error: "DB not configured" }, { status: 503 });
	}

	// Read kid first to get current level for difficulty
	const { data: kid } = await supabase
		.from("kids")
		.select("*")
		.eq("id", kidId)
		.single();

	const kidLevel = kid?.level ?? 1;
	const difficulty = difficultyForLevel(kidLevel);

	// Insert test record
	const { error: tError } = await supabase.from("tests").insert({
		kid_id: kidId,
		test_content: content,
		difficulty: difficulty,
		errors: result.errors,
		score: result.score,
		time_to_complete: result.timeToComplete,
		backspaces: result.backspaces ?? 0,
	});
	if (tError) {
		return NextResponse.json({ error: tError.message }, { status: 500 });
	}

	// Update kid aggregate stats
	if (kid) {
		const testsComplete = (kid.tests_complete ?? 0) + 1;
		const newWpm = Math.round(
			((kid.wpm ?? 0) * (kid.tests_complete ?? 0) + result.wpm) /
				Math.max(1, testsComplete),
		);

		// Evaluate streak
		const todayStr = today();
		const yesterdayStr = yesterday();
		const lastDate = kid.last_quiz_date;
		let newStreak = kid.streak ?? 0;
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

		const newCumulativeScore = Math.max(
			0,
			(kid.cumulative_score ?? 0) + result.score - penalty,
		);
		const coinsEarned = Math.max(1, Math.round(result.score / 10));
		const newCoins = (kid.coins ?? 0) + coinsEarned;

		// Level is now derived from cumulative score via tier system
		const newTier = getTier(newCumulativeScore);
		const newLevel = newTier.level;

		await supabase
			.from("kids")
			.update({
				tests_complete: testsComplete,
				wpm: newWpm,
				cumulative_score: newCumulativeScore,
				coins: newCoins,
				level: newLevel,
				streak: newStreak,
				last_quiz_date: todayStr,
				last_updated: new Date().toISOString(),
			})
			.eq("id", kidId);

		return NextResponse.json({
			kid: {
				kidId,
				name: kid.first_name,
				level: newLevel,
				cumulativeScore: newCumulativeScore,
				coins: newCoins,
				equipped: kid.equipped ?? {
					base: "base-boy",
					hat: null,
					outfit: null,
					weapon: null,
				},
				ownedItems: kid.owned_items ?? ["base-boy", "base-girl"],
				streak: newStreak,
				lastQuizDate: todayStr,
			},
			rank: null,
		});
	}

	return NextResponse.json({
		kid: {
			kidId,
			name: null,
			level: 1,
			cumulativeScore: 0,
			streak: 0,
			lastQuizDate: null,
		},
		rank: null,
	});
}
