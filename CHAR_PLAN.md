# Character Customization: Full Store Economy

This document outlines the future roadmap for TypeQuest's cosmetics system, beyond the current POC (proof-of-concept). The POC implements:
- A simple 2D paper-doll avatar system with 4 slots (base, hat, outfit, weapon)
- A hardcoded catalog of ~10 items
- A coins currency earned via tests (⅒ of test score) and spent on cosmetics
- Basic buy/equip UI on `/character`

## Future extensions

### 1. Expanded item categories & rarity tiers

**Current POC slots:** base, hat, outfit, weapon

**Proposed extended slots:**
- `hair` — hairstyles, colors
- `face` — eyes, expressions, accessories (glasses, mustache, etc.)
- `background` — character frame, backdrop
- `pet` — companion animal or object
- `idle_animation` — how the character breathes/sways

**Rarity tiers:**
- `common` — cost 20–50 coins, always available
- `rare` — cost 75–150 coins, themed drops (seasonal, event-based)
- `epic` — cost 200–400 coins, special effects (glow, animation effects)
- `legendary` — cost 500+ coins, one-of-a-kind or limited-time only

Visual treatment: tinted item borders/card backgrounds (common=gray, rare=blue, epic=purple, legendary=gold), optional rarity badges, glow effects in the store grid.

### 2. Database-backed catalog

**Current:** hardcoded `ITEMS` array in `src/lib/items.ts`

**Proposed:** new Supabase tables
```sql
create table if not exists public.items (
  id              text primary key,
  slot            text not null,
  name            text not null,
  description     text,
  cost            integer not null,
  rarity          text not null,  -- common, rare, epic, legendary
  image_url       text not null,
  animation_spec  jsonb,          -- optional: {type: "bounce", intensity: 0.5, ...}
  available_from  timestamptz,
  available_until timestamptz,    -- NULL = always available
  created         timestamptz not null default now(),
);

create table if not exists public.kid_items (
  kid_id          uuid not null references public.kids(id) on delete cascade,
  item_id         text not null references public.items(id) on delete restrict,
  acquired_at     timestamptz not null default now(),
  acquisition_type text,          -- "purchase", "level_milestone", "streak_reward", "seasonal"
  unique(kid_id, item_id)
);

create index if not exists kid_items_kid_id_idx on public.kid_items (kid_id);
create index if not exists items_slot_idx on public.items (slot);
create index if not exists items_rarity_idx on public.items (rarity);
```

Benefits:
- Items can be added/updated without code deploys.
- New items can be made available at specific dates (seasonal/event rotation).
- Track how kids acquired each item (purchase vs. earned).
- Admin can tune pricing and availability independently.

**Migration path:** 
1. Load from DB if available; fall back to hardcoded `ITEMS` array.
2. Replace the hardcoded array entirely once DB is seeded.

### 3. Rotating / featured store

Instead of showing all items, show a curated subset:
- **Daily rotation:** 3 random common + 1 random rare item refreshes daily.
- **Weekly featured:** 1 epic or legendary item, available for 7 days.
- **Seasonal collection:** themed items (spooky hats for October, holiday outfits in December).

Implementation: `/api/store-catalog?scope=daily|weekly|seasonal` returns the available-right-now subset. Client caches with a TTL that syncs to the next rotation boundary.

### 4. Non-purchase acquisition

Kids earn cosmetics in ways beyond coins:

- **Level-up unlocks:** reaching a new tier (Bronze→Silver, etc.) auto-unlocks a tier-themed item.
- **Streak milestones:** 7-day streak → unlock a "Hot Streak" item; 30-day → "Legendary Streak", etc.
- **Achievement badges:** "First 100 WPM", "Flawless test" (100% accuracy), "3 in a row", etc. → cosmetic unlocks.
- **Time-limited events:** "holiday event" where completing 5 tests in one day earns a holiday item.

Data: add `acquisition_type` to `kid_items` (enum: `"purchase"`, `"level_milestone"`, `"streak_reward"`, `"achievement"`, `"seasonal_event"`). When a kid qualifies, the backend automatically appends to `kid_items` without deducting coins.

### 5. Outfit matching sets & bonuses

A "set" groups related items (e.g., "Knight" = armor + shield + sword). Equipping the full set grants a small bonus or a special variant (e.g., glow effect, idle animation change).

**Example:**
```json
{
  "id": "set-knight",
  "name": "Knight Armor",
  "items": ["outfit-knight", "weapon-sword", "hat-crown"],
  "bonus": { "visual_effect": "gold_glow" }
}
```

When a kid equips all three, trigger a celebration and apply the bonus. Visual: a "set complete!" badge on the character preview.

### 6. Coin economy tuning

Current formula: `coins_per_test = max(1, round(test_score / 10))`.

**Questions to playtest:**
- **Earning rate:** is ⅒ of score too generous/stingy? (A 100-point test = 10 coins; a 1000-point test = 100 coins.)
- **Price targets:** at the current earning rate, how many tests to afford a rare (75 coins) vs. epic (200 coins)?
  - If kids average 50-point tests (5 coins/test), a rare item = ~15 tests (1-2 hours of gameplay).
  - If kids average 200-point tests (20 coins/test), a rare = ~4 tests (30 min).
- **Spending pressure:** should items feel achievable quickly (reachable in 1–2 sessions) or be long-term goals (weeks)?

**Tuning knobs:**
- Adjust coins-per-test formula (e.g., 20% instead of 10%, or use a curve: `small_bonus + sqrt(score)`).
- Adjust item prices per rarity.
- Add "flash sale" events (30% off rare items on weekends).
- Bonus coins for streaks (1.5x coins on a 7-day streak).

### 7. Cosmetic animations & FX

Current: idle sway/breathe (framer-motion `y: [0, -3, 0]` + `rotate`).

**Proposed** per-item effects:
- `idle_animation: "bounce"` → faster y-axis bob.
- `idle_animation: "spin"` → gentle rotate.
- `idle_animation: "pulse"` → scale up/down.
- `special_effect: "glow"` → add a blur + shadow or CSS glow.

Store these in the DB `animation_spec` jsonb; when rendering, apply the animation to the `CharacterAvatar` or individual layers. This makes rare/epic items feel more premium.

### 8. Admin dashboard

A simple internal tool (or Supabase dashboard direct access) to:
- CRUD items (add new, edit cost/rarity, toggle availability).
- View which kids own what items (popularity metrics).
- Trigger one-off item grants (e.g., "give all kids who reached level 10 the 'Legendary' achievement item").
- Tune coin multiplier and monitor the economy (avg coins per kid, coins earned vs. spent).

### 9. Client-side performance: thumbnails & caching

Current: each layer loads a full-size image. For large leaderboards (30+ rows with animated previews), this can be slow.

**Optimizations:**
- Generate/cache small thumbnail PNGs (40×40) for each item, separate from full-size (160×160).
- Use `<Image priority={false}` for leaderboard rows and defer loading until in-viewport.
- Preload the current player's equipped items on page load.
- Memoize `CharacterAvatar` component to prevent re-renders on sibling updates.

---

## Roadmap priority

**Phase 1 (done):** POC with hardcoded items, simple buy/equip, demo mode support.

**Phase 2 (next):**
- DB-backed catalog.
- Rarity tiers & visual treatment.
- Non-purchase acquisition (level/streak unlocks).

**Phase 3:**
- Rotating/featured store.
- Outfit sets & bonuses.
- Economy tuning & playtesting.

**Phase 4 (nice-to-have):**
- Admin dashboard.
- Custom animations & FX per item.
- Thumbnail optimization & performance.

---

## Open questions for design

1. **Cosmetics-only or stat-boosting items?** (Current: cosmetics only — preserves fair leaderboards since you can't buy WPM. Keep it?)
2. **Free-to-play or cosmetics monetization?** (Is this a revenue channel later, or purely fun rewards?)
3. **Trading/gifting between kids?** (E.g., "gift an item to a friend"? Adds complexity but increases engagement.)
4. **Seasonal deletion:** do limited-time items disappear from kids' inventories at the end of the season, or stay forever?
5. **Refund policy:** if a kid buys an item and regrets it, can they "sell" it back for 50% of the coins?

## Links & references

- Current code: `src/lib/items.ts`, `src/app/character/page.tsx`, `src/components/CharacterAvatar.tsx`
- Data layer: `src/lib/data.ts` (`buyItem`, `equipItem`)
- API routes: `/api/buy-item`, `/api/equip-item`
- Schema: `supabase/schema.sql` (`coins`, `equipped`, `owned_items` columns on `kids` table)
