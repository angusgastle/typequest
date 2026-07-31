-- Type Quest — Supabase schema
-- Run this in the Supabase SQL editor.

-- Kids profile (one per adventurer)
create table if not exists public.kids (
  id              uuid primary key default gen_random_uuid(),
  first_name      text        not null,
  last_name       text,
  nickname        text,
  age             integer,
  email           text,
  wpm             integer     not null default 0,
  tests_complete  integer     not null default 0,
  level           integer     not null default 1,
  cumulative_score integer    not null default 0,
  avatar          text        default null,   -- selected emoji avatar (legacy)
  avatar_color    text        default '#ff6b6b', -- avatar circle background color (legacy)
  coins           integer     not null default 0, -- spendable cosmetic currency
  equipped        jsonb       not null default '{}', -- e.g. {"base":"boy","hat":"wizard-hat","outfit":"vest","weapon":"sword"}
  owned_items     text[]      not null default '{}', -- array of owned item ids
  streak          integer     not null default 0, -- consecutive daily quiz streak
  last_quiz_date  date        default null,   -- last date a quiz was completed
  pin_hash        text        not null,       -- 4-digit PIN (demo hashing only)
  created         timestamptz not null default now(),
  last_updated    timestamptz not null default now()
);

create unique index if not exists kids_first_name_lower_uidx
  on public.kids (lower(first_name));

-- A completed typing test
create table if not exists public.tests (
  id              uuid primary key default gen_random_uuid(),
  kid_id          uuid not null references public.kids(id) on delete cascade,
  test_content    jsonb not null,           -- { prompt, theme, title }
  difficulty      integer not null default 1,
  errors          integer not null default 0,
  score           integer not null default 0,
  time_to_complete integer not null default 0, -- seconds
  backspaces      integer not null default 0, -- backspace key presses
  created         timestamptz not null default now(),
  last_updated    timestamptz not null default now()
);

create index if not exists tests_kid_id_idx on public.tests (kid_id);
create index if not exists tests_created_idx on public.tests (created);

-- Reusable adventure pool (generated/template content for reuse across kids)
create table if not exists public.adventures (
  id              uuid primary key default gen_random_uuid(),
  theme           text        not null,
  title           text        not null,
  prompt          text        not null,
  difficulty      integer     not null default 1,
  created         timestamptz not null default now()
);

create index if not exists adventures_difficulty_idx on public.adventures (difficulty);

-- Track which adventures a kid has already seen (to avoid repeats)
create table if not exists public.kid_seen_adventures (
  kid_id          uuid        not null references public.kids(id) on delete cascade,
  adventure_id    uuid        not null references public.adventures(id) on delete cascade,
  seen_at         timestamptz not null default now(),
  unique(kid_id, adventure_id)
);

create index if not exists kid_seen_adventures_kid_id_idx on public.kid_seen_adventures (kid_id);

-- Updated timestamp trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.last_updated = now();
  return new;
end;
$$;

drop trigger if exists trg_kids_touch on public.kids;
create trigger trg_kids_touch
  before update on public.kids
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_tests_touch on public.tests;
create trigger trg_tests_touch
  before update on public.tests
  for each row execute function public.touch_updated_at();

-- Row Level Security
alter table public.kids enable row level security;
alter table public.tests enable row level security;
alter table public.adventures enable row level security;
alter table public.kid_seen_adventures enable row level security;

-- Demo policy: anon key can read/write. Tighten for production.
create policy "kids_public_read" on public.kids for select using (true);
create policy "kids_public_insert" on public.kids for insert with check (true);
create policy "kids_public_update" on public.kids for update using (true);

create policy "tests_public_read" on public.tests for select using (true);
create policy "tests_public_insert" on public.tests for insert with check (true);
create policy "tests_public_update" on public.tests for update using (true);

create policy "adventures_public_read" on public.adventures for select using (true);
create policy "adventures_public_insert" on public.adventures for insert with check (true);

create policy "kid_seen_adventures_public_read" on public.kid_seen_adventures for select using (true);
create policy "kid_seen_adventures_public_insert" on public.kid_seen_adventures for insert with check (true);
