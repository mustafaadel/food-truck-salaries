-- Food Truck Salaries: database schema.
-- Paste this whole file into the Supabase SQL Editor and press Run. Running it again is safe, and it
-- also upgrades databases set up with an earlier version of this file without losing any records.
--
-- Everyone listed in public.admins shares the same workers and payments. Row level security lets
-- admins read and change everything and gives every other account nothing. The first account
-- created becomes an admin automatically; admins add more from the app's Settings page.

-- ---------- Admins ----------

create table if not exists public.admins (
  email text primary key check (email = lower(btrim(email)) and email like '_%@_%'),
  added_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admins a
    join auth.users u on lower(u.email) = a.email
    where u.id = auth.uid()
  )
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Until there is an admin, the next account created becomes one.
create or replace function public.make_first_user_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is not null and not exists (select 1 from public.admins) then
    insert into public.admins (email) values (lower(new.email)) on conflict do nothing;
  end if;
  return new;
end
$$;

revoke all on function public.make_first_user_admin() from public, anon, authenticated;

drop trigger if exists make_first_user_admin on auth.users;
create trigger make_first_user_admin
  after insert on auth.users
  for each row execute function public.make_first_user_admin();

-- Accounts that already exist when admins are first set up (sign-ups are closed, so these are the
-- logins you created yourself) all become admins.
insert into public.admins (email)
select lower(email) from auth.users
where email is not null and not exists (select 1 from public.admins)
on conflict do nothing;

-- ---------- Records ----------

create table if not exists public.workers (
  id uuid primary key default gen_random_uuid(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  name text not null check (length(btrim(name)) > 0),
  phone text,
  daily_amount numeric(12, 2) not null default 0 check (daily_amount >= 0),
  start_month text not null check (start_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  end_month text check (end_month ~ '^\d{4}-(0[1-9]|1[0-2])$' and end_month >= start_month),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.salary_rates (
  id uuid primary key default gen_random_uuid(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  worker_id uuid not null references public.workers (id) on delete cascade,
  effective_month text not null check (effective_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  monthly_amount numeric(12, 2) not null check (monthly_amount >= 0),
  created_at timestamptz not null default now(),
  unique (worker_id, effective_month)
);

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  worker_id uuid not null references public.workers (id) on delete cascade,
  entry_date date not null,
  kind text not null check (kind in ('daily', 'payment', 'deduction', 'bonus')),
  amount numeric(12, 2) not null check (amount > 0),
  note text,
  created_at timestamptz not null default now()
);

-- Upgrade from the first version, where each account had its own records (owner_id). The records
-- become shared, and deleting a login no longer deletes the records it created.
do $$
declare
  t text;
begin
  foreach t in array array['workers', 'salary_rates', 'entries'] loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'owner_id'
    ) then
      if t <> 'workers' then
        execute format('alter table public.%I drop constraint if exists %I', t, t || '_worker_id_owner_id_fkey');
        execute format(
          'alter table public.%I add constraint %I foreign key (worker_id) references public.workers (id) on delete cascade',
          t, t || '_worker_id_fkey');
      end if;
      execute format('alter table public.%I drop constraint if exists %I', t, t || '_owner_id_fkey');
      execute format('drop index if exists public.%I', t || '_owner_idx');
      execute format('alter table public.%I rename column owner_id to created_by', t);
      execute format('alter table public.%I alter column created_by drop not null', t);
      execute format(
        'alter table public.%I add constraint %I foreign key (created_by) references auth.users (id) on delete set null',
        t, t || '_created_by_fkey');
    end if;
  end loop;
  alter table public.workers drop constraint if exists workers_id_owner_id_key;
end
$$;

create index if not exists salary_rates_worker_idx on public.salary_rates (worker_id);
create index if not exists entries_worker_date_idx on public.entries (worker_id, entry_date);

-- ---------- Access rules ----------

alter table public.admins enable row level security;
alter table public.workers enable row level security;
alter table public.salary_rates enable row level security;
alter table public.entries enable row level security;

drop policy if exists "Owners manage their workers" on public.workers;
drop policy if exists "Owners manage their salary rates" on public.salary_rates;
drop policy if exists "Owners manage their entries" on public.entries;

drop policy if exists "Admins manage workers" on public.workers;
create policy "Admins manage workers" on public.workers
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Admins manage salary rates" on public.salary_rates;
create policy "Admins manage salary rates" on public.salary_rates
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Admins manage entries" on public.entries;
create policy "Admins manage entries" on public.entries
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Admins see admins" on public.admins;
create policy "Admins see admins" on public.admins
  for select to authenticated
  using ((select public.is_admin()));

drop policy if exists "Admins add admins" on public.admins;
create policy "Admins add admins" on public.admins
  for insert to authenticated
  with check ((select public.is_admin()));

-- Nobody can remove themselves, so there is always at least one admin left.
drop policy if exists "Admins remove other admins" on public.admins;
create policy "Admins remove other admins" on public.admins
  for delete to authenticated
  using ((select public.is_admin()) and email <> lower(coalesce((select auth.jwt()) ->> 'email', '')));

grant select, insert, update, delete on public.workers, public.salary_rates, public.entries to authenticated;
grant select, insert, delete on public.admins to authenticated;
revoke all on public.admins, public.workers, public.salary_rates, public.entries from anon;

-- Shows who can use the app.
select email as admins from public.admins order by added_at, email;
