-- ============================================================================
-- BCS Bank by OKZ (BBBOKZ) — Complete Free-Tier Supabase Schema & Auth RPCs
-- Run this once in Supabase SQL Editor (https://supabase.com/dashboard)
-- Supports: Google 1-Tap & Email/Password Auth, Profiles, Mock Attempts,
--           Topic Master Mastery Sync, Live Stats RPC, and Global Leaderboard.
-- ============================================================================

-- 1. User Profiles (linked to auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'BCS Scholar',
  target_bcs text default '51st BCS Cadre',
  bio text default 'Data-driven BCS Scholar • BBBOKZ',
  settings jsonb not null default '{}'::jsonb,
  mastery_map jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 2. Mock Test & Practice Attempts
create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id text not null,
  mode text not null default 'mock',
  total integer not null,
  correct integer not null,
  wrong integer not null,
  skipped integer not null default 0,
  score numeric(6,2) not null,
  duration_sec integer not null default 0,
  subjects jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(user_id, client_id)
);

create index if not exists idx_attempts_user_created on public.attempts (user_id, created_at desc);

-- 3. Auto-create profile when a new user signs up (Email or Google)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      split_part(coalesce(new.email, 'scholar'), '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. Row Level Security
alter table public.profiles enable row level security;
alter table public.attempts enable row level security;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile"
  on public.profiles for select using (auth.uid() = id);

drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles for update using (auth.uid() = id);

drop policy if exists "Users read own attempts" on public.attempts;
create policy "Users read own attempts"
  on public.attempts for select using (auth.uid() = user_id);

drop policy if exists "Users insert own attempts" on public.attempts;
create policy "Users insert own attempts"
  on public.attempts for insert with check (auth.uid() = user_id);

-- 5. RPC: my_stats() — Aggregated personal stats + subject breakdown + study streak
create or replace function public.my_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  res jsonb;
begin
  if uid is null then
    return jsonb_build_object(
      'attempts', 0, 'questions', 0, 'correct', 0, 'accuracy', 0,
      'best_score', null, 'avg_score', null, 'xp', 0,
      'last_studied', null, 'streak_days', 0, 'subjects', '{}'::jsonb
    );
  end if;

  with a as (
    select * from public.attempts where user_id = uid
  ),
  subj_agg as (
    select
      kv.key as subj,
      sum(coalesce((kv.value->>'correct')::int, 0)) as c,
      sum(coalesce((kv.value->>'total')::int, 0)) as t
    from a, jsonb_each(a.subjects) kv
    group by kv.key
  ),
  subj_obj as (
    select coalesce(jsonb_object_agg(subj, jsonb_build_object('correct', c, 'total', t)), '{}'::jsonb) as subjects
    from subj_agg
  ),
  days as (
    select count(distinct date_trunc('day', created_at))::int as d from a
  )
  select jsonb_build_object(
    'attempts', count(*)::int,
    'questions', coalesce(sum(total), 0)::int,
    'correct', coalesce(sum(correct), 0)::int,
    'accuracy', case when coalesce(sum(correct + wrong), 0) > 0
      then round((sum(correct)::numeric / sum(correct + wrong)::numeric) * 100, 1)
      else 0 end,
    'best_score', max(score),
    'avg_score', round(avg(score), 2),
    'xp', (coalesce(sum(correct), 0) * 10 + count(*) * 20)::int,
    'last_studied', max(created_at),
    'streak_days', (select d from days),
    'subjects', (select subjects from subj_obj)
  )
  into res
  from a;

  return coalesce(res, '{}'::jsonb);
end;
$$;

-- 6. RPC: get_leaderboard(lim int) — Global XP Leaderboard
create or replace function public.get_leaderboard(lim integer default 50)
returns table (
  rank integer,
  display_name text,
  xp integer,
  attempts integer,
  best_score numeric,
  is_me boolean
)
language sql
security definer
set search_path = public
as $$
  with agg as (
    select
      p.id,
      coalesce(nullif(trim(p.display_name), ''), 'BCS Scholar') as display_name,
      (coalesce(sum(a.correct), 0) * 10 + count(a.id) * 20)::int as xp,
      count(a.id)::int as attempts,
      max(a.score) as best_score
    from public.profiles p
    left join public.attempts a on a.user_id = p.id
    group by p.id, p.display_name
  )
  select
    row_number() over (order by agg.xp desc, agg.best_score desc nulls last)::int as rank,
    agg.display_name,
    agg.xp,
    agg.attempts,
    agg.best_score,
    (agg.id = auth.uid()) as is_me
  from agg
  order by agg.xp desc, agg.best_score desc nulls last
  limit greatest(1, least(lim, 100));
$$;

grant execute on function public.my_stats() to authenticated;
grant execute on function public.get_leaderboard(integer) to authenticated, anon;

-- 7. Tiny keep-alive health check view (so free-tier cron ping keeps DB awake 24/7)
create or replace view public.health_ping as
  select now() as server_time, 'bbbokz-ok'::text as status;
grant select on public.health_ping to anon, authenticated;
