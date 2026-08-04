import { NextResponse } from "next/server";
import { getServerSupabase, hasSupabase } from "@/lib/supabase-server";
import { getItem } from "@/lib/items";

export async function POST(req: Request) {
	const body = await req.json().catch(() => ({}));
	const kidId: string = body.kidId;
	const slot: string = body.slot;
	const itemId: string | null = body.itemId;
	if (!kidId || !slot) {
		return NextResponse.json({ error: "Missing data" }, { status: 400 });
	}

	// The base slot must always have a body — it can be swapped, never cleared.
	if (slot === "base" && itemId === null) {
		return NextResponse.json(
			{ error: "Base cannot be removed" },
			{ status: 400 },
		);
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

	// Validate ownership if equipping an item
	if (itemId !== null) {
		const item = getItem(itemId);
		if (!item) {
			return NextResponse.json({ error: "Item not found" }, { status: 404 });
		}
		if (item.slot !== slot) {
			return NextResponse.json(
				{ error: "Item slot mismatch" },
				{ status: 400 },
			);
		}
		const ownedItems = (kid.owned_items ?? []) as string[];
		// Free items (cost 0) are always ownable, regardless of owned_items.
		if (item.cost !== 0 && !ownedItems.includes(itemId)) {
			return NextResponse.json({ error: "Item not owned" }, { status: 400 });
		}
	}

	// Update equipped
	const equipped = (kid.equipped ?? {}) as Record<string, string | null>;
	equipped[slot] = itemId;

	const { error } = await supabase
		.from("kids")
		.update({
			equipped,
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
			coins: kid.coins ?? 0,
			equipped,
			ownedItems: kid.owned_items ?? ["base-boy", "base-girl"],
			streak: kid.streak ?? 0,
			lastQuizDate: kid.last_quiz_date ?? null,
		},
	});
}
