import { NextResponse } from "next/server";
import { getServerSupabase, hasSupabase } from "@/lib/supabase-server";

export async function PATCH(req: Request) {
	const body = await req.json().catch(() => ({}));
	const kidId: string = body.kidId;
	if (!kidId) {
		return NextResponse.json({ error: "Missing kidId" }, { status: 400 });
	}

	const updates: Record<string, unknown> = {};
	if (body.avatar !== undefined) updates.avatar = body.avatar;
	if (body.avatarColor !== undefined) updates.avatar_color = body.avatarColor;
	if (body.firstName !== undefined) updates.first_name = body.firstName;
	if (body.coins !== undefined) updates.coins = body.coins;
	if (body.equipped !== undefined) updates.equipped = body.equipped;
	if (body.ownedItems !== undefined) updates.owned_items = body.ownedItems;

	if (Object.keys(updates).length === 0) {
		return NextResponse.json({ error: "No updates provided" }, { status: 400 });
	}

	updates.last_updated = new Date().toISOString();

	const supabase = getServerSupabase();
	if (!hasSupabase() || !supabase) {
		return NextResponse.json({ error: "DB not configured" }, { status: 503 });
	}

	const { error } = await supabase.from("kids").update(updates).eq("id", kidId);

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	// Return updated kid data
	const { data: kid } = await supabase
		.from("kids")
		.select("*")
		.eq("id", kidId)
		.single();

	return NextResponse.json({
		kid: {
			kidId,
			name: kid?.first_name,
			level: kid?.level ?? 1,
			cumulativeScore: kid?.cumulative_score ?? 0,
			avatar: kid?.avatar ?? null,
			avatarColor: kid?.avatar_color ?? "#ff6b6b",
			coins: kid?.coins ?? 0,
			equipped: kid?.equipped ?? {
				base: "base-boy",
				hat: null,
				outfit: null,
				weapon: null,
			},
			ownedItems: kid?.owned_items ?? ["base-boy", "base-girl"],
			streak: kid?.streak ?? 0,
			lastQuizDate: kid?.last_quiz_date ?? null,
		},
	});
}
