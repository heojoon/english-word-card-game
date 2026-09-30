update public.shop_items
set price = 200
where code = 'wish';

update public.shop_items
set price = 400
where code in (
  'ranger_violet_crystal_skin',
  'pugilist_crystal_rose_skin',
  'mage_arcane_necromancer_skin',
  'warrior_golden_radiance_skin'
);
