-- Normal water equipment. Preserve existing purchases and equipment.
insert into public.shop_items
  (code, name, category, price, icon, description, repeatable, active, slot, rarity, stars, stat_key, stat_value, art_path)
values
  ('water_staff', '물의 지팡이', 'avatar', 110, '◆', '맑은 물의 결정이 정신력을 높이는 일반 지팡이입니다.', false, true, 'weapon', 'normal', 1, 'mp', 6, 'assets/items/equipment/item_water_staff_normal.webp'),
  ('water_spellbook', '물의 마법서', 'avatar', 200, '◆', '물의 마법이 깃든 책으로 정신력을 높이는 일반 마법서입니다.', false, true, 'weapon', 'normal', 1, 'mp', 8, 'assets/items/equipment/item_water_spellbook_normal.webp')
on conflict (code) do update
set name = excluded.name,
    category = excluded.category,
    price = excluded.price,
    icon = excluded.icon,
    description = excluded.description,
    repeatable = excluded.repeatable,
    active = excluded.active,
    slot = excluded.slot,
    rarity = excluded.rarity,
    stars = excluded.stars,
    stat_key = excluded.stat_key,
    stat_value = excluded.stat_value,
    art_path = excluded.art_path;
