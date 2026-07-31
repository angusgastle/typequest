import { NextResponse } from "next/server";
import {
	aiGenerateTest,
	difficultyForLevel,
	isAiConfigured,
	localGenerateTest,
} from "@/lib/generate-test";
import { getServerSupabase, hasSupabase } from "@/lib/supabase-server";
import type { TestContent } from "@/lib/types";

export async function POST(req: Request) {
	const body = await req.json().catch(() => ({}));
	const kidId: string = body.kidId;
	const kidName: string = body.kidName ?? "Friend";
	const level: number = Number(body.level ?? 1) || 1;

	if (!kidId) {
		return NextResponse.json({ error: "Missing kidId" }, { status: 400 });
	}

	const difficulty = difficultyForLevel(level);

	// Try Supabase pool
	if (hasSupabase()) {
		const supabase = getServerSupabase();
		if (supabase) {
			// Fetch kid's seen adventure IDs
			const { data: seenData } = await supabase
				.from("kid_seen_adventures")
				.select("adventure_id")
				.eq("kid_id", kidId);

			const seenIds = seenData?.map((row: any) => row.adventure_id) ?? [];

			// Query available adventures matching difficulty, excluding seen ones
			let query = supabase
				.from("adventures")
				.select("id, theme, title, prompt")
				.eq("difficulty", difficulty);

			if (seenIds.length > 0) {
				query = query.not("id", "in", `(${seenIds.join(",")})`);
			}

			const { data: availableAdventures } = await query;

			// If we found an unseen adventure, use it
			if (availableAdventures && availableAdventures.length > 0) {
				const chosen =
					availableAdventures[
						Math.floor(Math.random() * availableAdventures.length)
					];

				// Mark as seen
				await supabase.from("kid_seen_adventures").insert({
					kid_id: kidId,
					adventure_id: chosen.id,
				});

				const result: TestContent = {
					prompt: chosen.prompt,
					theme: chosen.theme,
					title: chosen.title,
				};
				return NextResponse.json(result);
			}

			// No unseen adventure found — generate a new one and add to pool
			const generated = isAiConfigured()
				? await aiGenerateTest(level, kidName)
				: localGenerateTest(level, kidName);

			const { data: inserted } = await supabase
				.from("adventures")
				.insert({
					theme: generated.theme,
					title: generated.title,
					prompt: generated.prompt,
					difficulty,
				})
				.select("id")
				.single();

			if (inserted) {
				await supabase.from("kid_seen_adventures").insert({
					kid_id: kidId,
					adventure_id: inserted.id,
				});
			}

			return NextResponse.json(generated);
		}
	}

	// Fallback: just generate fresh (no pool)
	const generated = isAiConfigured()
		? await aiGenerateTest(level, kidName)
		: localGenerateTest(level, kidName);

	return NextResponse.json(generated);
}
