#!/usr/bin/env node

import {
	localGenerateTest,
	aiGenerateTest,
	difficultyForLevel,
} from "../src/lib/generate-test";

/**
 * Test script to pull sample tests for each level and measure difficulty scaling.
 * Analyzes both text metrics and typing challenge difficulty.
 */

interface TextMetrics {
	characterCount: number;
	wordCount: number;
	sentenceCount: number;
	averageWordLength: number;
	averageSentenceLength: number;
	uniqueCharacters: Set<string>;
	specialCharCount: number;
	punctuationMarks: string[];
	hasNumbers: boolean;
	hasCapitals: boolean;
	shiftKeyFrequency: number;
	apostrophes: number;
	quotes: number;
	commas: number;
	numbers: number;
	uppercaseLetters: number;
	lowercaseLetters: number;
}

interface DifficultyScore {
	textComplexity: number; // 0-100
	typingChallenge: number; // 0-100
	overallScore: number; // 0-100
}

interface TestSample {
	level: number;
	difficultyTier: number;
	prompt: string;
	title: string;
	metrics: TextMetrics;
	difficulty: DifficultyScore;
}

function analyzeText(prompt: string): TextMetrics {
	const chars = new Set(prompt);
	const words = prompt
		.trim()
		.split(/\s+/)
		.filter((w) => w.length > 0);
	const sentences = prompt.split(/[.!?]+/).filter((s) => s.trim().length > 0);

	const specialChars = prompt.match(/[^a-zA-Z0-9\s]/g) || [];
	const uppercaseCount = (prompt.match(/[A-Z]/g) || []).length;
	const lowercaseCount = (prompt.match(/[a-z]/g) || []).length;
	const numbers = (prompt.match(/\d/g) || []).length;
	const apostrophes = (prompt.match(/'/g) || []).length;
	const quotes = (prompt.match(/['"]/g) || []).length;
	const commas = (prompt.match(/,/g) || []).length;

	// Calculate shift-key frequency (capitals + symbols that require shift)
	const shiftKeyChars =
		prompt.match(/[A-Z!@#$%^&*()_+=\-{}\[\]:;"'<>?,./\\|]/g) || [];
	const shiftKeyFrequency = shiftKeyChars.length / Math.max(1, prompt.length);

	const avgWordLength =
		words.length > 0
			? words.reduce((sum, w) => sum + w.length, 0) / words.length
			: 0;
	const avgSentenceLength =
		sentences.length > 0 ? words.length / sentences.length : 0;

	return {
		characterCount: prompt.length,
		wordCount: words.length,
		sentenceCount: sentences.length,
		averageWordLength: avgWordLength,
		averageSentenceLength: avgSentenceLength,
		uniqueCharacters: chars,
		specialCharCount: specialChars.length,
		punctuationMarks: specialChars,
		hasNumbers: numbers > 0,
		hasCapitals: uppercaseCount > 0,
		shiftKeyFrequency,
		apostrophes,
		quotes,
		commas,
		numbers,
		uppercaseLetters: uppercaseCount,
		lowercaseLetters: lowercaseCount,
	};
}

function calculateDifficultyScore(metrics: TextMetrics): DifficultyScore {
	// Text complexity: based on length, vocabulary diversity, punctuation
	const lengthScore = Math.min(100, (metrics.characterCount / 300) * 100); // 300 chars = 100 points
	const vocabularyScore = Math.min(
		100,
		(metrics.uniqueCharacters.size / 80) * 100,
	); // 80 unique chars = 100
	const punctuationScore = Math.min(
		100,
		(metrics.punctuationMarks.length / 20) * 100,
	);
	const sentenceComplexity = Math.min(
		100,
		(metrics.averageSentenceLength / 20) * 100,
	);

	const textComplexity =
		(lengthScore + vocabularyScore + punctuationScore + sentenceComplexity) / 4;

	// Typing challenge: based on shift-key frequency, special characters, numbers
	const shiftKeyScore = metrics.shiftKeyFrequency * 100;
	const specialCharScore = Math.min(100, (metrics.specialCharCount / 50) * 100);
	const numberScore = metrics.hasNumbers ? 20 : 0;
	const apostropheScore = Math.min(50, metrics.apostrophes * 5);
	const symbolVarietyScore = Math.min(100, metrics.punctuationMarks.length * 3);

	const typingChallenge =
		shiftKeyScore * 0.35 +
		specialCharScore * 0.25 +
		numberScore * 0.15 +
		apostropheScore * 0.15 +
		symbolVarietyScore * 0.1;

	const overallScore = textComplexity * 0.5 + typingChallenge * 0.5;

	return {
		textComplexity: Math.min(100, textComplexity),
		typingChallenge: Math.min(100, typingChallenge),
		overallScore: Math.min(100, overallScore),
	};
}

function formatMetrics(metrics: TextMetrics): string {
	return `
    Char Count: ${metrics.characterCount}
    Word Count: ${metrics.wordCount}
    Sentence Count: ${metrics.sentenceCount}
    Avg Word Length: ${metrics.averageWordLength.toFixed(2)}
    Avg Sentence Length: ${metrics.averageSentenceLength.toFixed(2)}
    Unique Characters: ${metrics.uniqueCharacters.size}
    Special Characters: ${metrics.specialCharCount}
    Shift-Key Frequency: ${(metrics.shiftKeyFrequency * 100).toFixed(1)}%
    Capitals: ${metrics.uppercaseLetters}
    Numbers: ${metrics.numbers}
    Apostrophes: ${metrics.apostrophes}
    Quotes: ${metrics.quotes}
    Commas: ${metrics.commas}`;
}

async function runTest(
	useAi: boolean = false,
	samplesPerLevel: number = 3,
): Promise<void> {
	console.log("📊 Typing Tutor - Difficulty Scaling Test\n");
	console.log(`Mode: ${useAi ? "AI Generation" : "Local Templates"}`);
	console.log(`Samples per level: ${samplesPerLevel}\n`);

	const levelSamples: TestSample[][] = [];
	const scoreByLevel: number[] = [];

	// Generate samples for each tier (not each level)
	const tiersSampled = new Set<number>();

	for (let level = 1; level <= 30; level++) {
		const difficultyTier = difficultyForLevel(level);

		// Only generate new samples if we haven't tested this tier yet
		if (!tiersSampled.has(difficultyTier)) {
			const samples: TestSample[] = [];

			for (let i = 0; i < samplesPerLevel; i++) {
				try {
					const content = useAi
						? await aiGenerateTest(level)
						: localGenerateTest(level);

					const metrics = analyzeText(content.prompt);
					const difficulty = calculateDifficultyScore(metrics);

					samples.push({
						level,
						difficultyTier,
						prompt:
							content.prompt.substring(0, 80) +
							(content.prompt.length > 80 ? "..." : ""),
						title: content.title,
						metrics,
						difficulty,
					});
				} catch (error) {
					console.error(`Error generating test for level ${level}:`, error);
				}
			}

			if (samples.length > 0) {
				levelSamples[difficultyTier - 1] = samples;
				tiersSampled.add(difficultyTier);
			}
		}
	}

	// Print summary table first
	console.log("=".repeat(120));
	console.log("DIFFICULTY PROGRESSION TABLE\n");
	console.log(
		"Tier | Levels    | Overall | Text     | Typing   | Sample Length | Unique | Shift% | Special",
	);
	console.log(
		"     |           | Score   | Complex  | Challenge| (chars)       | Chars  |        | Chars",
	);
	console.log("-".repeat(120));

	for (let tier = 1; tier <= 5; tier++) {
		const tierSamples = levelSamples[tier - 1];
		if (!tierSamples || tierSamples.length === 0) continue;

		const avgDifficulty =
			tierSamples.reduce((sum, s) => sum + s.difficulty.overallScore, 0) /
			tierSamples.length;
		const avgComplexity =
			tierSamples.reduce((sum, s) => sum + s.difficulty.textComplexity, 0) /
			tierSamples.length;
		const avgTypingChallenge =
			tierSamples.reduce((sum, s) => sum + s.difficulty.typingChallenge, 0) /
			tierSamples.length;
		const avgCharCount =
			tierSamples.reduce((sum, s) => sum + s.metrics.characterCount, 0) /
			tierSamples.length;
		const avgUniqueChars =
			tierSamples.reduce((sum, s) => sum + s.metrics.uniqueCharacters.size, 0) /
			tierSamples.length;
		const avgShiftFreq =
			tierSamples.reduce(
				(sum, s) => sum + s.metrics.shiftKeyFrequency * 100,
				0,
			) / tierSamples.length;
		const avgSpecialChars =
			tierSamples.reduce((sum, s) => sum + s.metrics.specialCharCount, 0) /
			tierSamples.length;

		scoreByLevel[tier] = avgDifficulty;

		const levelRange = getLevelRangeForTier(tier);
		console.log(
			`${tier}    | ${levelRange.padEnd(9)} | ${avgDifficulty.toFixed(1).padEnd(7)} | ${avgComplexity.toFixed(1).padEnd(8)} | ${avgTypingChallenge.toFixed(1).padEnd(8)} | ${avgCharCount.toFixed(0).padEnd(13)} | ${avgUniqueChars.toFixed(0).padEnd(6)} | ${avgShiftFreq.toFixed(1).padEnd(6)} | ${avgSpecialChars.toFixed(1)}`,
		);
	}

	// Analyze and print results
	console.log("\n" + "=".repeat(120));
	console.log("SAMPLE TESTS BY TIER\n");

	for (let tier = 1; tier <= 5; tier++) {
		const tierSamples = levelSamples[tier - 1];
		if (!tierSamples || tierSamples.length === 0) continue;

		const avgDifficulty =
			tierSamples.reduce((sum, s) => sum + s.difficulty.overallScore, 0) /
			tierSamples.length;
		const avgComplexity =
			tierSamples.reduce((sum, s) => sum + s.difficulty.textComplexity, 0) /
			tierSamples.length;
		const avgTypingChallenge =
			tierSamples.reduce((sum, s) => sum + s.difficulty.typingChallenge, 0) /
			tierSamples.length;

		console.log(`\n📍 TIER ${tier} (Levels ${getLevelRangeForTier(tier)})`);
		console.log("-".repeat(120));
		console.log(`Overall Difficulty Score: ${avgDifficulty.toFixed(1)}/100`);
		console.log(`  - Text Complexity: ${avgComplexity.toFixed(1)}/100`);
		console.log(`  - Typing Challenge: ${avgTypingChallenge.toFixed(1)}/100\n`);

		// Print individual samples
		for (let i = 0; i < tierSamples.length; i++) {
			const sample = tierSamples[i];
			// Reconstruct full prompt from metrics
			const fullPrompt = sample.prompt.endsWith("...")
				? "(Full prompt not shown - too long)"
				: sample.prompt;

			// Get the actual full prompt by re-extracting from content
			console.log(`Sample ${i + 1}: "${sample.title}"`);
			console.log(
				`Difficulty: ${sample.difficulty.overallScore.toFixed(1)}/100 | Char Count: ${sample.metrics.characterCount} | Unique Chars: ${sample.metrics.uniqueCharacters.size}`,
			);

			// Create a visual representation
			const promptPreview =
				levelSamples[tier - 1][i]?.metrics?.characterCount || 0;
			console.log(
				`\n"${sample.prompt}${promptPreview > 80 ? `..." (${sample.metrics.characterCount} chars total)` : '"'}`,
			);

			console.log(`\nMetrics:`);
			console.log(`  - Character Count: ${sample.metrics.characterCount}`);
			console.log(`  - Word Count: ${sample.metrics.wordCount}`);
			console.log(`  - Sentence Count: ${sample.metrics.sentenceCount}`);
			console.log(
				`  - Average Word Length: ${sample.metrics.averageWordLength.toFixed(2)}`,
			);
			console.log(
				`  - Unique Characters: ${sample.metrics.uniqueCharacters.size}`,
			);
			console.log(`  - Special Characters: ${sample.metrics.specialCharCount}`);
			console.log(
				`  - Shift-Key Frequency: ${(sample.metrics.shiftKeyFrequency * 100).toFixed(1)}%`,
			);
			console.log(`  - Capital Letters: ${sample.metrics.uppercaseLetters}`);
			console.log(`  - Numbers: ${sample.metrics.numbers}`);
			console.log(
				`  - Punctuation: ${sample.metrics.punctuationMarks.length} marks`,
			);
			console.log();
		}
	}

	// Summary analysis
	console.log("\n" + "=".repeat(100));
	console.log("DIFFICULTY PROGRESSION ANALYSIS\n");

	const tierScores = [
		scoreByLevel[1],
		scoreByLevel[2],
		scoreByLevel[3],
		scoreByLevel[4],
		scoreByLevel[5],
	].filter((s) => s !== undefined);

	if (tierScores.length > 1) {
		let isProgressing = true;
		for (let i = 1; i < tierScores.length; i++) {
			const diff = tierScores[i] - tierScores[i - 1];
			const status =
				diff > 5 ? "✅ INCREASES" : diff > -5 ? "⚠️ FLAT" : "❌ DECREASES";
			console.log(
				`Tier ${i} → Tier ${i + 1}: ${diff > 0 ? "+" : ""}${diff.toFixed(1)} points ${status}`,
			);
			if (diff <= 5) isProgressing = false;
		}

		console.log(
			`\n${isProgressing ? "✅" : "❌"} Overall: Difficulty ${isProgressing ? "SCALES PROPERLY" : "DOES NOT SCALE PROPERLY"}`,
		);

		if (!isProgressing) {
			console.log("\n🔧 RECOMMENDATIONS:");
			console.log(
				"  1. Increase prompt length in higher tiers (currently might be too similar)",
			);
			console.log(
				"  2. Add more punctuation complexity (quotes, semicolons, etc.)",
			);
			console.log(
				"  3. Include more numbers and special characters in tiers 4-5",
			);
			console.log("  4. Use longer words and more complex sentence structures");
			console.log(
				"  5. Review the AI generation prompts for better tier differentiation",
			);
		}
	}

	console.log("\n" + "=".repeat(100));
}

function getLevelRangeForTier(tier: number): string {
	const ranges: Record<number, string> = {
		1: "1-6",
		2: "7-12",
		3: "13-18",
		4: "19-24",
		5: "25-30",
	};
	return ranges[tier] || "";
}

// Run with AI if configured, otherwise use local
const useAi = !!process.env.ANTHROPIC_API_KEY;
const samplesPerLevel = parseInt(process.argv[2] || "2", 10);

runTest(useAi, samplesPerLevel).catch(console.error);
