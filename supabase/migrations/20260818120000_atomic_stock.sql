-- Atomické úpravy skladu.
--
-- Dosavadní postup "přečti stock -> přičti/odečti -> zapiš" umí při souběhu
-- dvou objednávek jeden odečet ztratit (obě čtou stejnou hodnotu). UPDATE
-- s výrazem je atomický na řádku. Edge funkce volají tyto RPC přednostně
-- a při jejich nepřítomnosti spadnou zpět na starou cestu.

create or replace function public.adjust_stock(p_product_id text, p_delta integer)
returns boolean
language plpgsql
security definer
as $$
declare updated integer;
begin
  update public.products
     set stock = greatest(0, coalesce(stock, 0) + p_delta)
   where id = p_product_id
     and stock is not null;
  get diagnostics updated = row_count;
  -- false = produkt neexistuje nebo sklad vede na variantách;
  -- volající pak použije původní cestu přes variants
  return updated > 0;
end;
$$;

revoke all on function public.adjust_stock(text, integer) from public, anon, authenticated;

create or replace function public.adjust_daily_deal_stock(p_slot_id text, p_delta integer)
returns boolean
language plpgsql
security definer
as $$
declare updated integer;
begin
  update public.daily_deal
     set stock = greatest(0, coalesce(stock, 0) + p_delta)
   where id = p_slot_id;
  get diagnostics updated = row_count;
  return updated > 0;
end;
$$;

revoke all on function public.adjust_daily_deal_stock(text, integer) from public, anon, authenticated;
