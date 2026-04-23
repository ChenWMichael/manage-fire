-- ManageFIRE Database Schema
-- Run this in your Supabase SQL editor after creating a new project.

-- ─── Profiles ─────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  email       text,
  full_name   text,
  avatar_url  text,
  fire_type   text not null default 'regular' check (fire_type in ('lean', 'regular', 'coast', 'fat')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ─── FIRE Scenarios ───────────────────────────────────────────────────────────
create table if not exists public.fire_scenarios (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid references auth.users(id) on delete cascade not null,
  name                 text not null default 'My FIRE Plan',
  fire_type            text default 'regular' check (fire_type in ('lean', 'regular', 'coast', 'fat')),
  current_age          integer check (current_age between 1 and 100),
  retirement_age       integer check (retirement_age between 1 and 100),
  current_savings      numeric(15, 2),
  monthly_contribution numeric(15, 2),
  annual_expenses      numeric(15, 2),
  expected_return      numeric(5, 2) default 7.0,
  withdrawal_rate      numeric(5, 2) default 4.0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.fire_scenarios enable row level security;

create policy "Users can view own scenarios"
  on public.fire_scenarios for select
  using (auth.uid() = user_id);

create policy "Users can insert own scenarios"
  on public.fire_scenarios for insert
  with check (auth.uid() = user_id);

create policy "Users can update own scenarios"
  on public.fire_scenarios for update
  using (auth.uid() = user_id);

create policy "Users can delete own scenarios"
  on public.fire_scenarios for delete
  using (auth.uid() = user_id);

-- ─── Auto-create profile on signup ────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Updated-at trigger ───────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

create trigger set_scenarios_updated_at
  before update on public.fire_scenarios
  for each row execute procedure public.set_updated_at();
