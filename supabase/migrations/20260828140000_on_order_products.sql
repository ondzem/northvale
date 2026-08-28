-- Zboží „Na objednávku“.
--
-- Provozovatel může nabízet produkty, které nedrží skladem — objednává je
-- u externího dodavatele až po objednávce zákazníka. Takový produkt:
--   - nemá skladovou zásobu (stock zůstává NULL, nikdy se neodečítá,
--     atomické funkce adjust_stock mají podmínku "stock IS NOT NULL"),
--   - má vlastní dodací lhůtu (delivery_time, např. „3–7 dnů“),
--     kterou si admin nastaví u každého produktu sám.

alter table public.products
  add column if not exists on_order boolean not null default false,
  add column if not exists delivery_time text;

comment on column public.products.on_order is
  'Zboží na objednávku — objednává se u externího dodavatele, sklad se nehlídá.';
comment on column public.products.delivery_time is
  'Dodací lhůta zboží na objednávku, volný text (např. „3–7 dnů“).';
