-- Food Truck Salaries: database schema.
-- Paste this whole file into the Supabase SQL Editor and press Run. Running it again is safe.
--
-- Every row belongs to the signed-in account that created it (owner_id), and row level security
-- makes sure an account can only ever see or change its own rows.

create table if not exists public.workers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  phone text,
  daily_amount numeric(12, 2) not null default 0 check (daily_amount >= 0),
  start_month text not null check (start_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  end_month text check (end_month ~ '^\d{4}-(0[1-9]|1[0-2])$' and end_month >= start_month),
  notes text,
  created_at timestamptz not null default now(),
  unique (id, owner_id)
);

create table if not exists public.salary_rates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  worker_id uuid not null,
  effective_month text not null check (effective_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  monthly_amount numeric(12, 2) not null check (monthly_amount >= 0),
  created_at timestamptz not null default now(),
  unique (worker_id, effective_month),
  foreign key (worker_id, owner_id) references public.workers (id, owner_id) on delete cascade
);

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  worker_id uuid not null,
  entry_date date not null,
  kind text not null check (kind in ('daily', 'payment', 'deduction', 'bonus')),
  amount numeric(12, 2) not null check (amount > 0),
  note text,
  created_at timestamptz not null default now(),
  foreign key (worker_id, owner_id) references public.workers (id, owner_id) on delete cascade
);

create index if not exists salary_rates_worker_idx on public.salary_rates (worker_id);
create index if not exists entries_worker_date_idx on public.entries (worker_id, entry_date);
create index if not exists workers_owner_idx on public.workers (owner_id);
create index if not exists salary_rates_owner_idx on public.salary_rates (owner_id);
create index if not exists entries_owner_idx on public.entries (owner_id);

alter table public.workers enable row level security;
alter table public.salary_rates enable row level security;
alter table public.entries enable row level security;

drop policy if exists "Owners manage their workers" on public.workers;
create policy "Owners manage their workers" on public.workers
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "Owners manage their salary rates" on public.salary_rates;
create policy "Owners manage their salary rates" on public.salary_rates
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "Owners manage their entries" on public.entries;
create policy "Owners manage their entries" on public.entries
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

grant select, insert, update, delete on public.workers, public.salary_rates, public.entries to authenticated;
revoke all on public.workers, public.salary_rates, public.entries from anon;
