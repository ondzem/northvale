-- Sloupec updated_at u produktů.
--
-- Administrace řadí produkty „od nejnovějších“, ale doteď měla k dispozici jen
-- created_at — právě upravený starý produkt tak zůstal dole. Nový sloupec se
-- plní sám při každé změně, takže naposledy upravené zboží jde nahoru.

alter table public.products
  add column if not exists updated_at timestamptz;

-- Doplnit stávajícím řádkům, ať řazení funguje i pro zboží založené dřív.
update public.products
set updated_at = created_at
where updated_at is null;

alter table public.products
  alter column updated_at set default now();

comment on column public.products.updated_at is
  'Čas poslední změny produktu. Plní trigger, používá se pro řazení v administraci.';

create or replace function public.touch_products_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;

create trigger products_set_updated_at
  before update on public.products
  for each row
  execute function public.touch_products_updated_at();
