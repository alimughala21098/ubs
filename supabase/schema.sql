-- FAR Tech — Upwork Bid Pipeline
-- Run this in the Supabase SQL editor (Project -> SQL Editor -> New query)

-- ---------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------
do $$ begin
  create type bid_stage as enum (
    'lead', 'submitted', 'replied', 'interview',
    'negotiation', 'won', 'lost', 'archived'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type budget_type as enum ('Fixed', 'Hourly');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_role as enum ('bidder', 'admin');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------
-- Profiles (extends auth.users with a role)
-- Saman = 'bidder', Ali Mirza / Rohaan Mughal = 'admin'
-- ---------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role user_role not null default 'bidder',
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'bidder')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------
-- Bids (the core pipeline table)
-- ---------------------------------------------------------------
create table if not exists public.bids (
  id uuid primary key default gen_random_uuid(),
  job_title text not null,
  job_link text,
  client text not null,
  client_rating numeric(2,1),
  client_country text,
  budget_type budget_type not null default 'Fixed',
  budget numeric(12,2) not null default 0,
  connects_spent integer not null default 0,
  proposal_template text,
  date_submitted date not null default current_date,
  last_activity timestamptz not null default now(),
  stage bid_stage not null default 'lead',
  needs_escalation boolean not null default false,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bids_stage_idx on public.bids (stage);
create index if not exists bids_date_submitted_idx on public.bids (date_submitted);
create index if not exists bids_needs_escalation_idx on public.bids (needs_escalation);

-- Keep updated_at current on every row change
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists bids_touch_updated_at on public.bids;
create trigger bids_touch_updated_at
  before update on public.bids
  for each row execute procedure public.touch_updated_at();

-- ---------------------------------------------------------------
-- Bid communication log (append-only, one row per entry)
-- ---------------------------------------------------------------
create table if not exists public.bid_logs (
  id uuid primary key default gen_random_uuid(),
  bid_id uuid not null references public.bids(id) on delete cascade,
  author text not null default 'Saman',
  text text not null,
  created_at timestamptz not null default now()
);

create index if not exists bid_logs_bid_id_idx on public.bid_logs (bid_id);

-- ---------------------------------------------------------------
-- Settings (single row, editable by admins)
-- ---------------------------------------------------------------
create table if not exists public.settings (
  id int primary key default 1,
  monthly_connects_cap integer not null default 500,
  probation_win_target integer not null default 5,
  commission_rate_percent numeric(5,2) not null default 10,
  escalation_budget_threshold numeric(12,2) not null default 2000,
  updated_at timestamptz not null default now(),
  constraint settings_singleton check (id = 1)
);

insert into public.settings (id)
values (1)
on conflict (id) do nothing;

drop trigger if exists settings_touch_updated_at on public.settings;
create trigger settings_touch_updated_at
  before update on public.settings
  for each row execute procedure public.touch_updated_at();

-- ---------------------------------------------------------------
-- Row Level Security
-- Any signed-in FAR Tech team member (bidder or admin) can read/write
-- the shared board. Tighten this further if you add more teams/orgs.
-- ---------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.bids enable row level security;
alter table public.bid_logs enable row level security;
alter table public.settings enable row level security;

drop policy if exists "profiles readable by team" on public.profiles;
create policy "profiles readable by team"
  on public.profiles for select
  using (auth.role() = 'authenticated');

drop policy if exists "bids readable by team" on public.bids;
create policy "bids readable by team"
  on public.bids for select
  using (auth.role() = 'authenticated');

drop policy if exists "bids writable by team" on public.bids;
create policy "bids writable by team"
  on public.bids for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "logs readable by team" on public.bid_logs;
create policy "logs readable by team"
  on public.bid_logs for select
  using (auth.role() = 'authenticated');

drop policy if exists "logs writable by team" on public.bid_logs;
create policy "logs writable by team"
  on public.bid_logs for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "settings readable by team" on public.settings;
create policy "settings readable by team"
  on public.settings for select
  using (auth.role() = 'authenticated');

-- Only admins (Ali / Rohaan) can edit settings
drop policy if exists "settings writable by admins" on public.settings;
create policy "settings writable by admins"
  on public.settings for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- ---------------------------------------------------------------
-- Realtime: broadcast row changes so every open tab stays in sync
-- ---------------------------------------------------------------
alter publication supabase_realtime add table public.bids;
alter publication supabase_realtime add table public.bid_logs;
alter publication supabase_realtime add table public.settings;
