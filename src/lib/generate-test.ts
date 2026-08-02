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
		"the cat sat on the mat",
		"a dog and a fox ran in the sun",
		"the red bird sat on a high tree",
	],
	2: [
		"The cat is happy. It likes to play. The dog can run fast.",
		"A fox can run very fast. It jumps over big rocks. The fox is clever.",
		"The moon is bright in the sky. I like to see it at night. Stars shine too.",
	],
	3: [
		"The quick, brown fox jumped over the lazy dog, and it was very fast. Everyone cheered loudly.",
		"Deep in the forest, the tiny dragon heard the wind, which sang softly through the tall trees above.",
		"She walked along the beach, watching the waves crash gently onto the warm sand, feeling happy and free.",
	],
	4: [
		"The explorer packed 3 items: a map, 2 water bottles, and a compass (worth $89.99). Day 5 of the journey had begun; the weather was cold & windy!",
		"There were 7 coins in the chest, worth $42.50 total. The pirate smiled; he had found treasure! It weighed 15 kg. The date: 1885.",
		"Maria found 4 keys on the shelf. One key cost $3.99; the others were free. She'd never seen anything like it (very strange!). Total: $3.99.",
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

Difficulty levels with specific requirements:
- Level 1: One simple sentence, lowercase, no capitals, no punctuation. Only basic 3-5 letter words. Example: "the cat sat on the red mat"
- Level 2: Two simple sentences. Capitals at sentence start, periods at end. Simple words, possibly one contraction (it's, can't). Example: "The cat is happy. It plays all day."
- Level 3: 2-3 sentences with commas and varied punctuation. Longer words, more complex structures. NO numbers or symbols. Example: "The quick, brown fox jumped over the lazy dog, and it was very fast."
- Level 4: 2-3 sentences or short paragraph. Include numbers (quantities, dates, percentages) and common symbols (&, $, %, :, ;). More punctuation variety. Example: "She found 3 coins; they sparkled. The total was $42.50!"
- Level 5: Multi-paragraph text (2-3 short paragraphs separated by newlines). Complex punctuation (quotes, exclamation marks, apostrophes, ellipsis, dashes). Numbers, symbols, and varied capitalization. Example: "The lab hummed with energy. "Subject #47 is responding well," she noted..."

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
