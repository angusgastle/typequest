import { NextResponse } from "next/server";
import { getServerSupabase, hasSupabase } from "@/lib/supabase-server";

export async function GET(req: Request) {
	const url = new URL(req.url);
	const kidId = url.searchParams.get("kidId");

	if (!kidId) {
		return NextResponse.json({ error: "Missing kidId" }, { status: 400 });
	}

	const supabase = getServerSupabase();
	if (!hasSupabase() || !supabase) {
		return NextResponse.json({ error: "DB not configured" }, { status: 503 });
	}

	// Get kid's basic stats
	const { data: kid } = await supabase
		.from("kids")
		.select("tests_complete, wpm")
		.eq("id", kidId)
		.single();

	// Get test records for detailed stats
	const { data: tests } = await supabase
		.from("tests")
		.select("test_content, errors, time_to_complete")
		.eq("kid_id", kidId);

	if (!tests || tests.length === 0) {
		return NextResponse.json({
			testsComplete: kid?.tests_complete ?? 0,
			avgWpm: 0,
			bestWpm: 0,
			avgAccuracy: 0,
		});
	}

	let totalWpm = 0;
	let bestWpm = 0;
	let totalAccuracy = 0;

	for (const t of tests) {
		const promptChars =
			(t.test_content as { prompt: string })?.prompt?.length ?? 0;
		const wpm = t.time_to_complete
			? Math.round(promptChars / 5 / (t.time_to_complete / 60))
			: 0;
		const accuracy = promptChars
			? Math.round(((promptChars - t.errors) / promptChars) * 100)
			: 0;
		totalWpm += wpm;
		if (wpm > bestWpm) bestWpm = wpm;
		totalAccuracy += accuracy;
	}

	return NextResponse.json({
		testsComplete: tests.length,
		avgWpm: Math.round(totalWpm / tests.length),
		bestWpm,
		avgAccuracy: Math.round(totalAccuracy / tests.length),
	});
}
