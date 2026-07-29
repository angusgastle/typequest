import { NextResponse } from "next/server";
import { getServerSupabase, hasSupabase } from "@/lib/supabase-server";

export async function POST(req: Request) {
	const body = await req.json().catch(() => ({}));
	const name: string = String(body.name ?? "").trim();
	const pin: string = String(body.pin ?? "").trim();
	if (!name)
		return NextResponse.json({ error: "Name required" }, { status: 400 });
	if (pin.length !== 4)
		return NextResponse.json(
			{ error: "PIN must be 4 digits" },
			{ status: 400 },
		);

	const supabase = getServerSupabase();
	if (!hasSupabase() || !supabase) {
		return NextResponse.json({ error: "DB not configured" }, { status: 503 });
	}

	// Find existing kid by name (case-insensitive).
	const { data: existing } = await supabase
		.from("kids")
		.select("*")
		.ilike("first_name", name)
		.maybeSingle();

	if (existing) {
		// Verify PIN
		if (existing.pin_hash !== pin) {
			return NextResponse.json({ error: "Wrong PIN!" }, { status: 401 });
		}
		return NextResponse.json({
			kidId: existing.id,
			name: existing.first_name,
			level: existing.level,
			cumulativeScore: existing.cumulative_score,
			avatar: existing.avatar ?? null,
			avatarColor: existing.avatar_color ?? "#ff6b6b",
			streak: existing.streak ?? 0,
			lastQuizDate: existing.last_quiz_date ?? null,
		});
	}

	// Create new kid
	const { data: created, error } = await supabase
		.from("kids")
		.insert({
			first_name: name,
			pin_hash: pin,
			wpm: 0,
			tests_complete: 0,
			level: 1,
			cumulative_score: 0,
			avatar: null,
			avatar_color: "#ff6b6b",
			streak: 0,
			last_quiz_date: null,
		})
		.select()
		.single();
	if (error || !created) {
		return NextResponse.json(
			{ error: "Could not create account" },
			{ status: 500 },
		);
	}
	return NextResponse.json({
		kidId: created.id,
		name: created.first_name,
		level: created.level,
		cumulativeScore: created.cumulative_score,
		avatar: created.avatar ?? null,
		avatarColor: created.avatar_color ?? "#ff6b6b",
		streak: created.streak ?? 0,
		lastQuizDate: created.last_quiz_date ?? null,
	});
}
