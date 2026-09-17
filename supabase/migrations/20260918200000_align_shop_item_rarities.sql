-- Keep existing catalog rows in sync without changing their price or ownership.
update public.shop_items
set rarity = 'unique', stars = 4
where category = 'avatar' and slot = 'skin';

update public.shop_items
set rarity = 'special', stars = 2
where category = 'gift';
