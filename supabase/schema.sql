-- BCS Bank by OKZ (BBBOKZ) — Free-Tier Supabase Schema
-- Run this once in Supabase SQL Editor (https://supabase.com/dashboard)

create table if not exists public.bbbokz_profiles (
  id uuid primary key default gen_random_uuid(),
  client_id text unique not null,
  display_name text not null default 'BCS Scholar',
  target_bcs text not null default '51st BCS Cadre',
  bio text default '',
  mastered_count integer not null default 0,
  best_mock_score numeric(6,2) default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.bbbokz_mock_attempts (
  id uuid primary key default gen_random_uuid(),
  client_id text not null,
  total_questions integer not null,
  correct integer not null,
  wrong integer not null,
  unanswered integer not null,
  score numeric(6,2) not null,
  duration_sec integer not null,
  subjects jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_bbbokz_attempts_client on public.bbbokz_mock_attempts (client_id, created_at desc);
create index if not exists idx_bbbokz_profiles_score on public.bbbokz_profiles (best_mock_score desc, mastered_count desc);

-- Enable Row Level Security (open read for leaderboard, client-scoped upsert for keyless free-tier sync)
alter table public.bbbokz_profiles enable row level security;
alter table public.bbbokz_mock_attempts enable row level security;

drop policy if exists "Public read leaderboard profiles" on public.bbbokz_profiles;
create policy "Public read leaderboard profiles"
  on public.bbbokz_profiles for select using (true);

drop policy if exists "Upsert own profile" on public.bbbokz_profiles;
create policy "Upsert own profile"
  on public.bbbokz_profiles for insert with check (true);

drop policy if exists "Update own profile" on public.bbbokz_profiles;
create policy "Update own profile"
  on public.bbbokz_profiles for update using (true);

drop policy if exists "Insert mock attempt" on public.bbbokz_mock_attempts;
create policy "Insert mock attempt"
  on public.bbbokz_mock_attempts for insert with check (true);

drop policy if exists "Read mock attempts" on public.bbbokz_mock_attempts;
create policy "Read mock attempts"
  on public.bbbokz_mock_attempts for select using (true);
