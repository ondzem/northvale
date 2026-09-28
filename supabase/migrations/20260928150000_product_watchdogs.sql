-- Hlídací pes u produktů (skladem / v akci / cena pod limit).
--
-- Zákazník si na detailu produktu nastaví hlídání; edge funkce
-- product-watchdog ho uloží, pošle potvrzení a každých 15 minut
-- (pg_cron) kontroluje, jestli podmínka nastala — pak pošle e-mail
-- a nastaví notified_at. Jedno hlídání = jeden e-mail.
--
-- Tabulka obsahuje e-maily zákazníků: prohlížeč k ní NEMÁ přístup
-- (RLS bez politik). Zapisuje a čte jen edge funkce (service role).
-- Admin vidí jen počty přes funkci watchdog_counts().

create table if not exists public.product_watchdogs (
  id uuid primary key default gen_random_uuid(),
  product_id text not null,
  email text not null,
  type text not null check (type in ('stock', 'sale', 'price')),
  price_limit numeric check (price_limit is null or price_limit > 0),
  lang text not null default 'CZ',
  user_id uuid,
  unsubscribe_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  notified_at timestamptz,
  cancelled_at timestamptz
);

-- Stejný e-mail nemůže hlídat totéž dvakrát (dokud hlídání běží)
create unique index if not exists product_watchdogs_active_uniq
  on public.product_watchdogs (product_id, lower(email), type)
  where notified_at is null and cancelled_at is null;

create index if not exists product_watchdogs_active_product
  on public.product_watchdogs (product_id)
  where notified_at is null and cancelled_at is null;

create unique index if not exists product_watchdogs_token_uniq
  on public.product_watchdogs (unsubscribe_token);

alter table public.product_watchdogs enable row level security;
revoke all on public.product_watchdogs from anon, authenticated;

-- Počty aktivních hlídání podle produktu — jen pro admina, bez e-mailů.
create or replace function public.watchdog_counts()
returns table (
  product_id text,
  stock_count int,
  sale_count int,
  price_count int,
  total int,
  last_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    w.product_id,
    count(*) filter (where w.type = 'stock')::int,
    count(*) filter (where w.type = 'sale')::int,
    count(*) filter (where w.type = 'price')::int,
    count(*)::int,
    max(w.created_at)
  from public.product_watchdogs w
  where w.notified_at is null
    and w.cancelled_at is null
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  group by w.product_id
$$;

revoke all on function public.watchdog_counts() from public, anon;
grant execute on function public.watchdog_counts() to authenticated;
