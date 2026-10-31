-- 1) Lehký pohled pro edge funkci product-feed.
-- Obrázky jsou v products jako base64 (stovky kB); feed potřebuje jen začátek,
-- aby poznal formát. Bez toho by se při každém stažení feedu tahaly celé fotky.
create or replace view public.feed_products
with (security_invoker = true) as
select
  id, name, game, edition, category, subcat, description, short_description,
  price, stock, preorder, custom_params, ean, on_order, delivery_time, lang, type,
  case when image like 'data:%' then left(image, 48) else image end as image
from public.products;

revoke all on public.feed_products from anon, authenticated;
grant select on public.feed_products to service_role;

-- Veřejný bucket s hotovými XML feedy (plní edge funkce product-feed).
insert into storage.buckets (id, name, public)
values ('feeds', 'feeds', true)
on conflict (id) do update set public = true;

-- 2) Rozsah slevového kódu. Stávající kódy zůstávají na celý košík.
alter table public.discount_codes
  add column if not exists scope text not null default 'all',
  add column if not exists scope_products text[] not null default '{}',
  add column if not exists scope_categories text[] not null default '{}';

alter table public.discount_codes drop constraint if exists discount_codes_scope_check;
alter table public.discount_codes
  add constraint discount_codes_scope_check check (scope in ('all', 'products', 'categories'));
