-- Rare Light equipment: shared catalog for authenticated purchases and rewards.
insert into public.shop_items
  (code, name, category, price, icon, description, repeatable, active, slot, rarity, stars, stat_key, stat_value, art_path)
values
  ('light_sword', '빛의 검', 'avatar', 500, '◆', '빛의 결정과 은백색 소재가 공격을 높이는 레어 검입니다.', false, true, 'weapon', 'rare', 3, 'atk', 20, 'assets/items/equipment/item_light_sword_rare.webp'),
  ('light_armor', '빛의 갑옷', 'avatar', 500, '◆', '빛의 결정과 은백색 소재가 체력을 높이는 레어 갑옷입니다.', false, true, 'body', 'rare', 3, 'hp', 20, 'assets/items/equipment/item_light_armor_rare.webp'),
  ('light_helmet', '빛의 투구', 'avatar', 500, '◆', '빛의 결정과 은백색 소재가 체력을 높이는 레어 투구입니다.', false, true, 'head', 'rare', 3, 'hp', 15, 'assets/items/equipment/item_light_helmet_rare.webp'),
  ('light_boots', '빛의 부츠', 'avatar', 500, '◆', '빛의 결정과 은백색 소재가 체력을 높이는 레어 부츠입니다.', false, true, 'feet', 'rare', 3, 'hp', 15, 'assets/items/equipment/item_light_boots_rare.webp'),
  ('light_cape', '빛의 망토', 'avatar', 500, '◆', '빛의 결정과 은백색 소재가 체력을 높이는 레어 망토입니다.', false, true, 'back', 'rare', 3, 'hp', 15, 'assets/items/equipment/item_light_cape_rare.webp'),
  ('light_ring', '빛의 반지', 'avatar', 500, '◆', '빛의 결정과 은백색 소재가 정신을 높이는 레어 반지입니다. 오라 슬롯에 장착합니다.', false, true, 'aura', 'rare', 3, 'mp', 15, 'assets/items/equipment/item_light_ring_rare.webp')
on conflict (code) do update set
  name = excluded.name,
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
