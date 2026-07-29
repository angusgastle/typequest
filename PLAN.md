# Type Quest — Plan Summary

A kid-friendly typing tutor. Kids log in, embark on AI-generated typing
adventures, and compete on a global leaderboard.

## Stack

- **Next.js 16** (App Router, Turbopack, React 19) on **Vercel**
- **Supabase** (Postgres + RLS) for persistent storage
- **Anthropic Claude Haiku** (`claude-haiku-4-5-20251001`) for adventure generation
- **Framer Motion** + Tailwind v4 for motion and the kid-friendly look
- **Biome** for lint + format

## Pages

### 1. Login (`/`)
- Enter name + 4-digit PIN
- New kids auto-create an account; returning kids verify PIN
- On success → `/adventure`

### 2. Adventure (`/adventure`)
- "Start Your Next Adventure" → generates an AI test via Haiku
- **Intro screen**: tier badge + points + keyboard preview with finger guides
- **TypingTest** component (the critical UI):
  - Big reactive prompt text — typed = teal, current = sunny pulse, errors = red strike-through
  - Timer ring (counts down, turns coral in danger zone)
  - **Virtual keyboard** at the bottom with outlined SVG hands over the home row
  - Next key glows; active finger lifts; pressed keys pop
  - Backspace tracking (counted and displayed in results)
- On completion → confetti results screen (score, WPM, accuracy, errors, time, backspaces) + "Next Adventure"
- Results stored to the DB; kid's tier/stats/streak updated

### 3. Profile (`/profile`)
- **Avatar selection**: 30+ emoji options + color circle background
- **Edit name** and **Change PIN** (requires old PIN)
- **Tier display**: Epic Books–style tier badge with progress bar (Bronze→Silver→Gold→Diamond→Emerald→Platinum, 5 sub-levels each)
- **Stats panel**: total quizzes, avg/best WPM, avg accuracy
- **Streak calendar**: 7-day view + streak multiplier (1.0x–1.5x)
- Clicking name in NavBar → `/profile`

### 4. Leaderboard (`/leaderboard`)
- Global ranking across all kids
- Toggle: **This Week** vs **All Time**
- Rows: rank medal, avatar (selected or deterministic), nickname, WPM, accuracy, score; "you" highlighted

### Top Nav (everywhere except login)
- Logo (left) · Score ⭐ (center) · Name + tier badge + avatar (right)

## Points System

- **Completion bonus**: 10 points
- **Speed bonus**: WPM × 1
- **Accuracy bonus**: accuracy × 0.5 (rounded)
- **Level bonus**: level × 2
- **Streak multiplier**: 1.0x (day 1) → 1.1x (days 2-3) → 1.2x (days 4-6) → 1.5x (day 7+)
- **Formula**: `floor((10 + wpm + round(accuracy*0.5) + level*2) * streakMultiplier)`

Example: Level 4, 15 WPM, 95% accuracy, no streak = 81 points

## Tier System

Epic Books–style progression based on cumulative score:

| Tier | Sub-levels | Point thresholds |
|---|---|---|
| 🥉 Bronze | 1–5 | 0, 100, 250, 500, 1,000 |
| 🥈 Silver | 1–5 | 1,500, 2,250, 3,000, 4,000, 5,000 |
| 🥇 Gold | 1–5 | 6,500, 8,500, 11,000, 14,000, 18,000 |
| 💎 Diamond | 1–5 | 23,000, 29,000, 36,000, 44,000, 55,000 |
| 🟢 Emerald | 1–5 | 68,000, 85,000, 105,000, 130,000, 160,000 |
| 🔷 Platinum | 1–5 | 200,000, 250,000, 310,000, 380,000, 500,000 |

Level (1–30) is derived from tier + sub-level: Bronze 1 = level 1, Silver 1 = level 6, etc.

## Daily Streak System

- Complete a quiz every day to build streak
- **Streak multiplier** boosts points (up to 1.5x at 7+ days)
- **Missed day**: -50 points penalty + streak resets to 0
- Cannot go below 0 points

## Difficulty Tiers (5 levels)

| Levels | Tier | Text style |
|---|---|---|
| 1–2 | 1 | One short sentence, lowercase, no punctuation |
| 3–4 | 2 | Two sentences, basic punctuation |
| 5–7 | 3 | 2-3 sentences, punctuation + capitals |
| 8–11 | 4 | Paragraph, full punctuation, numbers |
| 12+ | 5 | Multi-paragraph, complex sentences, symbols |

## Data Model

```
kids
  id (uuid), first_name, last_name, nickname, age, email,
  wpm, tests_complete, level, cumulative_score,
  avatar, avatar_color, streak, last_quiz_date,
  pin_hash, created, last_updated

tests
  id (uuid), kid_id → kids(id),
  test_content (jsonb: { prompt, theme, title }),
  difficulty, errors, score, time_to_complete, backspaces,
  created, last_updated
```

Schema with RLS policies lives in `supabase/schema.sql`.

## Demo Mode

With no env vars set, the app runs entirely on **localStorage** so it's
immediately playable. Adding Supabase + Anthropic keys upgrades to real
persistence and AI adventures automatically.

## API Routes

- `POST /api/login` — find-or-create kid, verify PIN
- `POST /api/generate-test` — Haiku adventure (falls back to local templates)
- `POST /api/submit-test` — store test, update kid aggregates, evaluate streak
- `GET /api/leaderboard?scope=week|all` — ranked rows
- `PATCH /api/update-kid` — update avatar, avatar_color, first_name
- `POST /api/change-pin` — verify old PIN, set new PIN
- `GET /api/kid-stats?kidId=...` — aggregated test stats for profile

## Tooling

- `npm run dev` — dev server
- `npm run build` — production build
- `npm run lint` — biome lint
- `npm run format` — biome format --write
- `npm run check` — biome check (lint + format + imports)

## Setup

1. `npm install && npm run dev` — runs in demo mode
2. Supabase: run `supabase/schema.sql`, fill `NEXT_PUBLIC_SUPABASE_*` + `SUPABASE_SERVICE_ROLE_KEY`
3. AI: set `ANTHROPIC_API_KEY`
4. `vercel` to deploy

## Repo

- Private: https://github.com/angusgastle/typequest
