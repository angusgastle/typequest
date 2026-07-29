import { NextResponse } from "next/server";
import {
	aiGenerateTest,
	localGenerateTest,
	isAiConfigured,
} from "@/lib/generate-test";

export async function POST(req: Request) {
	const body = await req.json().catch(() => ({}));
	const level = Number(body.level ?? 1) || 1;

	const content = isAiConfigured()
		? await aiGenerateTest(level)
		: localGenerateTest(level);

	return NextResponse.json(content);
}
