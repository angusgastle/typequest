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
	"The Crystal Lighthouse",
	"The Shadow Garden",
];

const GENRES = ["Adventure", "Mystery", "Science Fiction", "School Drama"];

function getMonthName(): string {
	const months = [
		"January",
		"February",
		"March",
		"April",
		"May",
		"June",
		"July",
		"August",
		"September",
		"October",
		"November",
		"December",
	];
	return months[new Date().getMonth()];
}

function getSeason(): string {
	const month = new Date().getMonth();
	if (month >= 2 && month <= 4) return "Spring";
	if (month >= 5 && month <= 7) return "Summer";
	if (month >= 8 && month <= 10) return "Autumn";
	return "Winter";
}

/** Map absolute level (1-30) to a 5-tier difficulty index. */
function difficultyForLevel(level: number): number {
	if (level <= 2) return 1;
	if (level <= 4) return 2;
	if (level <= 7) return 3;
	if (level <= 11) return 4;
	return 5;
}

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
	4: [
		"The explorer packed her bag with a compass, 3 water bottles, and a worn map. She stepped into the cave, listening to water drip far below. Day 14 of the expedition had begun.",
		"Captain Felix steered the ship through stormy seas, checking the radar for islands. The crew of 7 worked the ropes while rain hammered the deck. They had 200 miles left to sail.",
	],
	5: [
		'The laboratory hummed with energy as Dr. Kim adjusted the dials. "Subject #47 is responding well," she noted, writing 87.3% on her clipboard. The machine\'s output had increased by 12% since Monday; a breakthrough! She smiled & wondered: could this change everything?\n\nMeanwhile, across campus, her colleague Prof. Reyes was reaching the opposite conclusion. His data showed a 5% decline, not growth. "We need to compare notes," he muttered, dialing her extension.',
		"The ancient clock tower struck midnight. Its 12 chimes echoed through the empty streets, each one louder than the last. Below, in the abandoned bookshop on 5th Avenue, a single light flickered. Mrs. Patel, the keeper of secrets, turned the brass key in lock #7. The door creaked open; behind it lay a staircase descending into darkness. 'Welcome back,' whispered the shadows. 'We have been waiting for 100 years.'",
	],
};

export function localGenerateTest(
	level: number,
	kidName?: string,
): TestContent {
	const lvl = difficultyForLevel(level);
	const pool = TEMPLATES[lvl];
	const prompt = pool[Math.floor(Math.random() * pool.length)];
	const theme = THEMES[Math.floor(Math.random() * THEMES.length)];
	const genre = GENRES[Math.floor(Math.random() * GENRES.length)];
	return { prompt, theme, title: `${genre}: ${theme}` };
}

export async function aiGenerateTest(
	level: number,
	kidName?: string,
): Promise<TestContent> {
	const apiKey = process.env.ANTHROPIC_API_KEY;
	if (!apiKey) {
		return localGenerateTest(level, kidName);
	}

	const client = new Anthropic({ apiKey });
	const lvl = difficultyForLevel(level);
	const genre = GENRES[Math.floor(Math.random() * GENRES.length)];
	const month = getMonthName();
	const season = getSeason();

	const systemPrompt =
		"You are a friendly storyteller for a kids' typing tutor. Generate a fun, age-appropriate typing adventure. Always use Canadian spelling (e.g., colour, behaviour, centre, honour, favourite, neighbour, metre, litre).";

	const userPrompt = `Generate a fun, kid-friendly ${genre} typing adventure for typing level ${lvl}.
Current Context:
- Genre: ${genre}
- Month: ${month}
- Season: ${season}
${kidName ? `- Character Name: ${kidName} (include ${kidName} as a character in the story)` : ""}

Difficulty levels:
- Level 1: one short simple sentence, lowercase, no punctuation.
- Level 2: two sentences with basic punctuation, still simple words.
- Level 3: a richer 2-3 sentence paragraph with punctuation and some capitals.
- Level 4: a paragraph with full punctuation, capitals, and numbers.
- Level 5: multi-paragraph text with complex sentences, symbols (! ? ; '), and varied punctuation.

Use Canadian spelling (colour, behaviour, centre, honour, favourite, neighbour, metre, litre, etc.). Keep it encouraging and age-appropriate. Do not include emoji inside the text. Respond ONLY with valid JSON, no markdown fences, in this exact shape:
{"title": string, "theme": string, "prompt": string}`;

	try {
		const response = await client.messages.create({
			model: HAIKU_MODEL,
			max_tokens: 400,
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
		return localGenerateTest(level, kidName);
	}
}

export function isAiConfigured(): boolean {
	return !!process.env.ANTHROPIC_API_KEY;
}

export { difficultyForLevel };
