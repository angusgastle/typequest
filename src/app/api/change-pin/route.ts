import { NextResponse } from "next/server";
import { getServerSupabase, hasSupabase } from "@/lib/supabase-server";

export async function POST(req: Request) {
	const body = await req.json().catch(() => ({}));
	const kidId: string = body.kidId;
	const oldPin: string = String(body.oldPin ?? "").trim();
	const newPin: string = String(body.newPin ?? "").trim();

	if (!kidId) {
		return NextResponse.json({ error: "Missing kidId" }, { status: 400 });
	}
	if (oldPin.length !== 4 || newPin.length !== 4) {
		return NextResponse.json(
			{ error: "PIN must be 4 digits" },
			{ status: 400 },
		);
	}

	const supabase = getServerSupabase();
	if (!hasSupabase() || !supabase) {
		return NextResponse.json({ error: "DB not configured" }, { status: 503 });
	}

	// Verify old PIN
	const { data: kid } = await supabase
		.from("kids")
		.select("pin_hash")
		.eq("id", kidId)
		.single();

	if (!kid || kid.pin_hash !== oldPin) {
		return NextResponse.json({ error: "Wrong PIN!" }, { status: 401 });
	}

	// Update to new PIN
	const { error } = await supabase
		.from("kids")
		.update({
			pin_hash: newPin,
			last_updated: new Date().toISOString(),
		})
		.eq("id", kidId);

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	return NextResponse.json({ success: true });
}
