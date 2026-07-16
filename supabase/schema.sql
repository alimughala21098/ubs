-- FAR Tech — Upwork Bid Pipeline
-- Run this in the Supabase SQL editor (Project -> SQL Editor -> New query)
-- Safe to re-run: uses create-if-not-exists / drop-and-recreate patterns throughout.

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
-- Two roles:
--   admin  — sees every bid, manages Settings, creates/edits/removes
--            teammate accounts from Settings -> Team
--   bidder — sees and manages only the bids they personally created
-- Accounts are created exclusively by an admin (Settings -> Team).
-- There is no public self-signup — Login.jsx is sign-in only.
-- ---------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text,
  role user_role not null default 'bidder',
  position text not null default 'Upwork Bidder (Probation)',
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists position text not null default 'Upwork Bidder (Probation)';

-- Auto-create a profile row whenever a new auth user is created.
-- Admin-created users (via the manage-employee edge function using
-- supabase.auth.admin.createUser) pass full_name/role/email through
-- user_metadata, so this trigger works the same way for every account.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role, email, position)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'bidder'),
    new.email,
    coalesce(new.raw_user_meta_data->>'position', 'Upwork Bidder (Probation)')
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Looks up the CURRENT signed-in user's role. security definer so it
-- bypasses the profiles table's own RLS — this is what lets RLS policies
-- below check "is this caller an admin?" without infinite recursion.
create or replace function public.current_user_role()
returns user_role
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------
-- Bids (the core pipeline table)
-- created_by identifies which bidder owns the bid. Kept nullable with
-- "on delete set null" so removing a teammate later never deletes or
-- blocks deletion of their historical bids.
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
  escalation_manual boolean not null default false,
  escalation_status text not null default 'pending',
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migrate an existing bids.created_by FK that didn't have "on delete set null"
do $$ begin
  alter table public.bids drop constraint if exists bids_created_by_fkey;
  alter table public.bids
    add constraint bids_created_by_fkey
    foreign key (created_by) references public.profiles(id) on delete set null;
exception when others then null; end $$;

alter table public.bids add column if not exists escalation_manual boolean not null default false;
alter table public.bids add column if not exists escalation_status text not null default 'pending';

do $$ begin
  alter table public.bids drop constraint if exists bids_escalation_status_check;
  alter table public.bids
    add constraint bids_escalation_status_check
    check (escalation_status in ('pending', 'approved', 'declined'));
exception when others then null; end $$;

-- One-time backfill: bids flagged before escalation_manual existed are treated
-- as manually flagged so they don't silently un-flag the first time someone
-- edits them (needs_escalation itself gets recomputed fresh from here on).
update public.bids set escalation_manual = true
where needs_escalation = true and escalation_manual = false;

create index if not exists bids_stage_idx on public.bids (stage);
create index if not exists bids_date_submitted_idx on public.bids (date_submitted);
create index if not exists bids_needs_escalation_idx on public.bids (needs_escalation);
create index if not exists bids_created_by_idx on public.bids (created_by);

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
  author text not null default 'Team',
  text text not null,
  created_at timestamptz not null default now()
);

create index if not exists bid_logs_bid_id_idx on public.bid_logs (bid_id);

-- ---------------------------------------------------------------
-- Settings (single row, editable by admins only)
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
-- Admins: full read/write on bids, bid_logs, all profiles, settings.
-- Bidders: read/write only their OWN bids and bid_logs on those bids;
-- can read their own profile plus (for display purposes) teammates'
-- names are not exposed to bidders — only admins see the full roster.
-- ---------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.bids enable row level security;
alter table public.bid_logs enable row level security;
alter table public.settings enable row level security;

-- profiles: everyone can read their own row; admins can read every row
drop policy if exists "profiles readable by team" on public.profiles;
drop policy if exists "profiles readable by self or admin" on public.profiles;
create policy "profiles readable by self or admin"
  on public.profiles for select
  using (id = auth.uid() or public.current_user_role() = 'admin');

-- profiles are otherwise only written by the manage-employee edge
-- function, which uses the service role key and bypasses RLS entirely.

-- bids: admin sees/edits everything; bidder sees/edits only their own
drop policy if exists "bids readable by team" on public.bids;
drop policy if exists "bids writable by team" on public.bids;
drop policy if exists "bids select own or admin" on public.bids;
drop policy if exists "bids insert own or admin" on public.bids;
drop policy if exists "bids update own or admin" on public.bids;
drop policy if exists "bids delete own or admin" on public.bids;

create policy "bids select own or admin"
  on public.bids for select
  using (public.current_user_role() = 'admin' or created_by = auth.uid());

create policy "bids insert own or admin"
  on public.bids for insert
  with check (public.current_user_role() = 'admin' or created_by = auth.uid());

create policy "bids update own or admin"
  on public.bids for update
  using (public.current_user_role() = 'admin' or created_by = auth.uid())
  with check (public.current_user_role() = 'admin' or created_by = auth.uid());

create policy "bids delete own or admin"
  on public.bids for delete
  using (public.current_user_role() = 'admin' or created_by = auth.uid());

-- bid_logs: follow the same ownership as the parent bid
drop policy if exists "logs readable by team" on public.bid_logs;
drop policy if exists "logs writable by team" on public.bid_logs;
drop policy if exists "logs select via bid access" on public.bid_logs;
drop policy if exists "logs insert via bid access" on public.bid_logs;

create policy "logs select via bid access"
  on public.bid_logs for select
  using (
    exists (
      select 1 from public.bids
      where bids.id = bid_logs.bid_id
        and (public.current_user_role() = 'admin' or bids.created_by = auth.uid())
    )
  );

create policy "logs insert via bid access"
  on public.bid_logs for insert
  with check (
    exists (
      select 1 from public.bids
      where bids.id = bid_logs.bid_id
        and (public.current_user_role() = 'admin' or bids.created_by = auth.uid())
    )
  );

-- settings: everyone signed in can read; only admins can update
drop policy if exists "settings readable by team" on public.settings;
create policy "settings readable by team"
  on public.settings for select
  using (auth.role() = 'authenticated');

drop policy if exists "settings writable by admins" on public.settings;
create policy "settings writable by admins"
  on public.settings for update
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- ---------------------------------------------------------------
-- Realtime: broadcast row changes so every open tab stays in sync
-- ---------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.bids;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.bid_logs;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.settings;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.profiles;
exception when duplicate_object then null; end $$;
