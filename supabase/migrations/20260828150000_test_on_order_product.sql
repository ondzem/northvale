-- Testovací produkt pro režim „Na objednávku“ (na přání provozovatele zůstává
-- v obchodě, aby si mohl prohlédnout, jak režim vypadá pro zákazníka).
-- Slovo „Testovací“ v názvu ho automaticky vyřazuje z XML feedů
-- (viz filtr v scripts/generate-feeds.js). Smazat jde normálně v adminu.

insert into public.products
  (id, name, type, game, edition, price, stock, image,
   short_description, description, on_order, delivery_time, no_vat)
values
  ('testovaci-produkt-na-objednavku',
   'Testovací produkt — Na objednávku',
   'sealed',
   'Pokémon',
   'Ukázka',
   499,
   null,
   '/product-images/wilds-unknown-booster-box.webp',
   'Ukázkový produkt v režimu „Na objednávku“ — nedržíme skladem, objednáváme u dodavatele po objednávce zákazníka.',
   'Tento produkt slouží k ukázce režimu „Na objednávku“. Sklad se u něj nevede, zákazník ho může koupit kdykoli a dodací lhůta se zobrazuje přímo na této stránce.',
   true,
   '3–7 dnů',
   false)
on conflict (id) do update set
  on_order = excluded.on_order,
  delivery_time = excluded.delivery_time,
  stock = excluded.stock;
