import { NextResponse } from "next/server";
import {
	aiGenerateTest,
	isAiConfigured,
	localGenerateTest,
} from "@/lib/generate-test";

export async function POST(req: Request) {
	const body = await req.json().catch(() => ({}));
	const level = Number(body.level ?? 1) || 1;
	const kidName: string = body.kidName ?? "Friend";

	const content = isAiConfigured()
		? await aiGenerateTest(level, kidName)
		: localGenerateTest(level, kidName);

	return NextResponse.json(content);
}
