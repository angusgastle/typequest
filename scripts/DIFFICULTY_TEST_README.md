# Difficulty Scaling Test

This test script analyzes whether typing prompts scale in difficulty appropriately across the 5 difficulty tiers.

## What It Tests

The script generates sample tests for each tier and measures difficulty using a **multi-dimensional approach**:

### 1. Text Complexity (50% of score)
- **Length**: Character and word count (longer = harder)
- **Vocabulary Diversity**: Unique character count (more variety = harder)
- **Punctuation**: Count and types of punctuation marks (more = harder)
- **Sentence Structure**: Average sentence length (longer/more complex = harder)

### 2. Typing Challenge (50% of score)
- **Shift-Key Frequency**: How often caps/symbols require shift key (more = harder)
- **Special Characters**: Numbers, symbols, apostrophes, quotes (more = harder)
- **Character Variety**: Different punctuation types used (more = harder)

### Overall Difficulty Score
Combined 0-100 score that should **increase monotonically** from Tier 1 → Tier 5.

## How to Run

### Quick test (default: 2 samples per tier, uses local templates)
```bash
npm run test:difficulty
```

### With more samples
```bash
npm run test:difficulty 5
```

### With AI generation (requires ANTHROPIC_API_KEY)
```bash
ANTHROPIC_API_KEY=sk-... npm run test:difficulty 3
```

## Interpreting Results

### ✅ Healthy scaling
```
Tier 1 → Tier 2: +10.5 points ✅ INCREASES
Tier 2 → Tier 3: +8.2 points ✅ INCREASES
Tier 3 → Tier 4: +12.1 points ✅ INCREASES
Tier 4 → Tier 5: +9.8 points ✅ INCREASES
```

### ⚠️ Problem: Flat difficulty
```
Tier 1: 15.3/100
Tier 2: 16.1/100  (only +0.8)
Tier 3: 15.9/100  (-0.2)
Tier 4: 14.5/100  (-1.4)  ❌ DECREASING
Tier 5: 25.1/100
```

If you see this, check the AI prompts or local templates—they're generating similarly-difficult text across tiers.

## Sample Output

```
TIER 1 (Levels 1-2)
Overall Difficulty Score: 12.5/100
  - Text Complexity: 10.2/100
  - Typing Challenge: 14.8/100

  Sample 1: "Adventure: The Whispering Cavern"
  Level 1 | Difficulty: 12.5/100
  Prompt: the quick brown fox jumps over the lazy dog...
  Text Metrics:
    Char Count: 44
    Word Count: 9
    Unique Characters: 20
    Shift-Key Frequency: 0.0%
    ...
```

## Fixing Scaling Issues

If difficulty doesn't scale properly, try:

1. **Increase prompt length** for higher tiers
   - Tier 1: 30-50 chars
   - Tier 3: 100-150 chars
   - Tier 5: 200-400 chars

2. **Add more punctuation** in higher tiers
   - Tier 1: mostly periods
   - Tier 5: semicolons, quotes, parentheses, ellipsis

3. **Include more special characters** in Tiers 4-5
   - Numbers (e.g., "3 water bottles", "87.3%")
   - Symbols (e.g., "&", "$", "@")
   - Apostrophes and contractions (e.g., "it's", "don't")

4. **Increase word complexity**
   - Tier 1: simple words (cat, run, sun)
   - Tier 5: complex words (laboratory, expedition, colleague)

5. **Use varied sentence structure** in higher tiers
   - Tier 1: simple sentences
   - Tier 5: complex with nested clauses

## Metrics Explained

| Metric | What It Measures | Why It Matters |
|--------|------------------|-----------------|
| Character Count | Total text length | Longer texts take more typing, allow more mistakes |
| Word Count | Number of words | More words = more opportunities to make errors |
| Avg Word Length | Average length of each word | Longer words are harder to type accurately |
| Unique Characters | How many different chars used | More variety = less muscle memory = harder |
| Shift-Key Frequency | % of chars needing shift | Shift requires hand repositioning, harder for kids |
| Special Characters | Count of symbols/numbers/punctuation | Each special char requires accurate finger placement |
| Sentence Count | Number of sentences | More sentences = more punctuation transitions |

## Next Steps

1. Run this test with current generation settings
2. Check if Tier 1-5 scores increase properly
3. If not, adjust AI prompt in `src/lib/generate-test.ts`
4. Re-run test to verify fix

## Current AI Prompt Location

See `src/lib/generate-test.ts`, lines 113-131, in the `aiGenerateTest()` function.

The key parameters are in the user prompt:
```
- Level 1: one short simple sentence, lowercase, no punctuation.
- Level 2: two sentences with basic punctuation, still simple words.
- Level 3: a richer 2-3 sentence paragraph with punctuation and some capitals.
- Level 4: a paragraph with full punctuation, capitals, and numbers.
- Level 5: multi-paragraph text with complex sentences, symbols (! ? ; '), and varied punctuation.
```

You might need to be more explicit about the differences.
