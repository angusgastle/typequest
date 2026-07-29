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
- **TypingTest** component (the critical UI):
  - Big reactive prompt text in the middle — typed = teal, current = sunny pulse, errors = red strike-through
  - Timer ring (counts down, turns coral in danger zone)
  - **Virtual keyboard** at the bottom with outlined SVG hands over the home row
  - Next key glows; active finger lifts; pressed keys pop
- On completion → confetti results screen (score, WPM, accuracy, errors) + "Next Adventure"
- Results stored to the DB; kid's level/WPM/score updated

### 3. Leaderboard (`/leaderboard`)
- Global ranking across all kids
- Toggle: **This Week** vs **All Time**
- Rows: rank medal, avatar, nickname, WPM, accuracy, score; "you" highlighted

### Top Nav (everywhere except login)
- Logo (left) · Score ⭐ (center) · Name + avatar (right)

## Data Model

```
kids
  id (uuid), first_name, last_name, nickname, age, email,
  wpm, tests_complete, level, cumulative_score,
  pin_hash, created, last_updated

tests
  id (uuid), kid_id → kids(id),
  test_content (jsonb: { prompt, theme, title }),
  difficulty, errors, score, time_to_complete,
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
- `POST /api/submit-test` — store test, update kid aggregates
- `GET /api/leaderboard?scope=week|all` — ranked rows

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
