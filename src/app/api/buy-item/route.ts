import { NextResponse } from "next/server";
import { getServerSupabase, hasSupabase } from "@/lib/supabase-server";
import { getItem } from "@/lib/items";

export async function POST(req: Request) {
	const body = await req.json().catch(() => ({}));
	const kidId: string = body.kidId;
	const itemId: string = body.itemId;
	if (!kidId || !itemId) {
		return NextResponse.json({ error: "Missing data" }, { status: 400 });
	}

	const item = getItem(itemId);
	if (!item) {
		return NextResponse.json({ error: "Item not found" }, { status: 404 });
	}

	const supabase = getServerSupabase();
	if (!hasSupabase() || !supabase) {
		return NextResponse.json({ error: "DB not configured" }, { status: 503 });
	}

	// Read kid
	const { data: kid } = await supabase
		.from("kids")
		.select("*")
		.eq("id", kidId)
		.single();

	if (!kid) {
		return NextResponse.json({ error: "Kid not found" }, { status: 404 });
	}

	// Check affordability
	if (item.cost > 0 && (kid.coins ?? 0) < item.cost) {
		return NextResponse.json({ error: "Not enough coins" }, { status: 400 });
	}

	// Add to owned items and deduct coins
	const ownedItems = (kid.owned_items ?? []) as string[];
	if (!ownedItems.includes(itemId)) {
		ownedItems.push(itemId);
	}
	const newCoins = Math.max(0, (kid.coins ?? 0) - item.cost);

	const { error } = await supabase
		.from("kids")
		.update({
			owned_items: ownedItems,
			coins: newCoins,
			last_updated: new Date().toISOString(),
		})
		.eq("id", kidId);

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	return NextResponse.json({
		kid: {
			kidId,
			name: kid.first_name,
			level: kid.level ?? 1,
			cumulativeScore: kid.cumulative_score ?? 0,
			avatar: kid.avatar ?? null,
			avatarColor: kid.avatar_color ?? "#ff6b6b",
			coins: newCoins,
			equipped: kid.equipped ?? {
				base: "base-boy",
				hat: null,
				outfit: null,
				weapon: null,
			},
			ownedItems,
			streak: kid.streak ?? 0,
			lastQuizDate: kid.last_quiz_date ?? null,
		},
	});
}
