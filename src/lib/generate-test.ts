import Anthropic from "@anthropic-ai/sdk";
import type { TestContent } from "./types";

const HAIKU_MODEL = "claude-haiku-4-5-20251001";

/**
 * Local test generator — used as a fallback when the Anthropic API key isn't
 * configured, so the app is always playable.
 */

const THEMES = [
	"The Whispering Cavern",
	"The Cloud Castle",
	"Fox and the Moon",
	"The Jellybean Forest",
	"Rocket to Planet Pom",
	"The Sleepy Dragon",
	"The Singing River",
	"The Marshmallow Maze",
];

const TEMPLATES: Record<number, string[]> = {
	1: [
		"the quick brown fox jumps over the lazy dog",
		"a kind cat and a small dog play in the warm sun",
		"the big tree has a tiny nest way up high",
	],
	2: [
		"A wise old owl lived in a quiet tree. She liked to watch the moon at night.",
		"The little fox could run very fast. He liked to race the wind each day.",
		"A small boat sailed across the blue lake. The sun was warm and bright.",
	],
	3: [
		"Deep in the whispering cavern, a tiny dragon slept on a pile of shiny coins, dreaming of flying through the clouds.",
		"The cloud castle floated above the mountains. Its gates were made of light, and the wind sang songs through the towers.",
	],
};

export function localGenerateTest(level: number): TestContent {
	const lvl = Math.max(1, Math.min(3, Math.ceil(level / 2) || 1));
	const pool = TEMPLATES[lvl];
	const prompt = pool[Math.floor(Math.random() * pool.length)];
	const theme = THEMES[Math.floor(Math.random() * THEMES.length)];
	return { prompt, theme, title: theme };
}

export async function aiGenerateTest(level: number): Promise<TestContent> {
	const apiKey = process.env.ANTHROPIC_API_KEY;
	if (!apiKey) {
		return localGenerateTest(level);
	}

	const client = new Anthropic({ apiKey });
	const lvl = Math.max(1, Math.min(3, Math.ceil(level / 2) || 1));

	const systemPrompt =
		"You are a friendly storyteller for a kids' typing tutor. Generate a fun, age-appropriate typing adventure.";

	const userPrompt = `Generate a fun, kid-friendly typing adventure for typing level ${lvl}.
- Level 1: one short simple sentence, lowercase, no punctuation.
- Level 2: two sentences with punctuation, still simple words.
- Level 3: a richer 2-3 sentence paragraph with punctuation.

Keep it encouraging and age-appropriate. Do not include emoji inside the text. Respond ONLY with valid JSON, no markdown fences, in this exact shape:
{"title": string, "theme": string, "prompt": string}`;

	try {
		const response = await client.messages.create({
			model: HAIKU_MODEL,
			max_tokens: 300,
			system: systemPrompt,
			messages: [{ role: "user", content: userPrompt }],
		});
		const text = response.content
			.filter((c) => c.type === "text")
			.map((c) => (c as { text: string }).text)
			.join("")
			.trim();
		const cleaned = text.replace(/```json|```/g, "").trim();
		const parsed = JSON.parse(cleaned);
		return {
			title: parsed.title,
			theme: parsed.theme,
			prompt: parsed.prompt,
		};
	} catch {
		return localGenerateTest(level);
	}
}

export function isAiConfigured(): boolean {
	return !!process.env.ANTHROPIC_API_KEY;
}
