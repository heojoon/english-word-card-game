-- Existing equipment ownership and bonus amounts remain intact.
update public.shop_items
set stat_key='hp',description=replace(replace(description,'방어력','체력'),'방어','체력')
where stat_key='def';
alter table public.shop_items drop constraint shop_items_stat_key_check;
alter table public.shop_items add constraint shop_items_stat_key_check
  check (stat_key is null or stat_key in ('hp','mp','atk','luk'));
