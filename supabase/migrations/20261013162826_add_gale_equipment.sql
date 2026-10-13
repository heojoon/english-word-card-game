-- Normal Gale equipment. Existing purchases and equipment stay intact.
insert into public.shop_items
  (code, name, category, price, icon, description, repeatable, active, slot, rarity, stars, stat_key, stat_value, art_path)
values
  ('gale_sword', '질풍의 검', 'avatar', 100, '◆', '가벼운 은빛 칼날과 바람의 결정이 공격을 높이는 일반 검입니다.', false, true, 'weapon', 'normal', 1, 'atk', 5, 'assets/items/equipment/item_gale_sword_normal.webp'),
  ('gale_cape', '질풍의 망토', 'avatar', 100, '◆', '바람을 머금은 은보랏빛 천이 체력을 높이는 일반 망토입니다.', false, true, 'back', 'normal', 1, 'hp', 5, 'assets/items/equipment/item_gale_cape_normal.webp'),
  ('gale_ring', '질풍의 반지', 'avatar', 100, '◆', '작은 바람의 결정이 정신을 높이는 일반 반지입니다. 오라 슬롯에 장착합니다.', false, true, 'aura', 'normal', 1, 'mp', 5, 'assets/items/equipment/item_gale_ring_normal.webp'),
  ('gale_armor', '질풍의 갑옷', 'avatar', 150, '◆', '가벼운 은빛 판과 바람의 결정이 체력을 높이는 일반 갑옷입니다.', false, true, 'body', 'normal', 1, 'hp', 5, 'assets/items/equipment/item_gale_armor_normal.webp'),
  ('gale_helmet', '질풍의 투구', 'avatar', 100, '◆', '은빛 날개 장식과 바람의 결정이 체력을 높이는 일반 투구입니다.', false, true, 'head', 'normal', 1, 'hp', 5, 'assets/items/equipment/item_gale_helmet_normal.webp')
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
