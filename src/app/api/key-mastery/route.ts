import { NextResponse } from "next/server";
import { getServerSupabase, hasSupabase } from "@/lib/supabase-server";
import type { KeyMastery } from "@/lib/types";

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

	const { data: rows } = await supabase
		.from("key_mastery")
		.select("key_label, attempts, correct")
		.eq("kid_id", kidId);

	const mastery: KeyMastery = {};
	for (const r of rows ?? []) {
		mastery[r.key_label] = {
			attempts: r.attempts,
			correct: r.correct,
		};
	}
	return NextResponse.json(mastery);
}

export async function POST(req: Request) {
	const body = await req.json().catch(() => ({}));
	const kidId: string = body.kidId;
	const delta: KeyMastery = body.delta;

	if (!kidId || !delta) {
		return NextResponse.json({ error: "Missing data" }, { status: 400 });
	}

	const supabase = getServerSupabase();
	if (!hasSupabase() || !supabase) {
		return NextResponse.json({ error: "DB not configured" }, { status: 503 });
	}

	// Fetch existing rows for this kid so we can merge deltas into one upsert.
	const { data: existing } = await supabase
		.from("key_mastery")
		.select("key_label, attempts, correct")
		.eq("kid_id", kidId);

	const current: KeyMastery = {};
	for (const r of existing ?? []) {
		current[r.key_label] = {
			attempts: r.attempts,
			correct: r.correct,
		};
	}

	const rows = [];
	for (const key of Object.keys(delta)) {
		const d = delta[key];
		const c = current[key] ?? { attempts: 0, correct: 0 };
		rows.push({
			kid_id: kidId,
			key_label: key,
			attempts: c.attempts + d.attempts,
			correct: c.correct + d.correct,
			last_updated: new Date().toISOString(),
		});
	}

	if (rows.length === 0) {
		return NextResponse.json(current);
	}

	await supabase
		.from("key_mastery")
		.upsert(rows, { onConflict: "kid_id,key_label" });

	// Return the merged mastery.
	const merged: KeyMastery = { ...current };
	for (const r of rows) {
		merged[r.key_label] = {
			attempts: r.attempts,
			correct: r.correct,
		};
	}
	return NextResponse.json(merged);
}
