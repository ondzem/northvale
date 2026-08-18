-- Zavření veřejného čtení tabulky discount_codes.
--
-- Problém: anonymní klíč (viditelný ve zdrojáku webu) mohl přes PostgREST
-- přečíst CELOU tabulku slevových kódů včetně nezveřejněných. Web přitom
-- potřebuje jen ověřit JEDEN konkrétní kód, který zákazník zadá.
--
-- Řešení: odebrat anonovi přímý přístup k tabulce a nabídnout mu místo toho
-- funkci, která vrátí právě jen jeden přesně zadaný kód. Do existujících RLS
-- politik nezasahujeme → admin (role authenticated) i server (service key)
-- fungují beze změny.

revoke select, insert, update, delete on public.discount_codes from anon;

-- Bezpečné ověření jednoho kódu pro nepřihlášené i přihlášené zákazníky.
-- SECURITY DEFINER → běží pod vlastníkem funkce, obchází RLS, ale vrací
-- výhradně jeden řádek pro přesně zadaný kód. Nelze přes ni tabulku vylistovat.
create or replace function public.lookup_discount_code(p_code text)
returns setof public.discount_codes
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.discount_codes
  where upper(trim(code)) = upper(trim(p_code))
  limit 1;
$$;

revoke all on function public.lookup_discount_code(text) from public;
grant execute on function public.lookup_discount_code(text) to anon, authenticated;
