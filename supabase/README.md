# Type Quest — Setup

A kid-friendly typing tutor built on Next.js 16, Supabase, and the Vercel AI Gateway.

The app runs **immediately without any backend** in **Demo Mode** (data stored
in your browser's localStorage). To make adventures persistent and shareable
across kids, connect Supabase and the AI Gateway.

## 1. Demo mode (no config)

```bash
npm install
npm run dev
```

Open http://localhost:3000, type a name + any 4-digit PIN, and play.

## 2. Supabase

1. Create a new project at https://supabase.com.
2. Open the SQL editor and run `supabase/schema.sql`.
3. Copy `.env.local.example` → `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # server-side privileged writes (API routes)
```

With these present, the app automatically switches from localStorage demo
mode to Supabase.

## 3. Anthropic (themed adventures)

Adventures are generated with **Claude Haiku** via the Anthropic SDK. Add your
key (get one at https://console.anthropic.com) to `.env.local`:

```
ANTHROPIC_API_KEY=...
```

With a key present, `/api/generate-test` calls Claude Haiku
(`claude-haiku-4-5-20251001`). Without a key, a local content generator is used
as a fallback so the app always works.

## Deploy

```bash
vercel
```
