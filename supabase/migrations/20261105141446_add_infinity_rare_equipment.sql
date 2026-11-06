-- Rare Infinity attack equipment: stronger and more expensive than each matching Corrupted item.
-- Publish the matching frontend artwork with this catalog migration.
insert into public.shop_items
  (code, name, category, price, icon, description, repeatable, active, slot, rarity, stars, stat_key, stat_value, art_path)
values
  ('infinity_sword', '무한의 검', 'avatar', 500, '◆', '무한의 고리와 청보라 수정이 공격을 강화하는 희귀 검입니다.', false, true, 'weapon', 'rare', 3, 'atk', 20, 'assets/items/equipment/item_infinity_sword_rare.webp'),
  ('infinity_boots', '무한의 장화', 'avatar', 500, '◆', '무한의 고리와 청보라 수정이 공격을 강화하는 희귀 장화입니다.', false, true, 'feet', 'rare', 3, 'atk', 18, 'assets/items/equipment/item_infinity_boots_rare.webp'),
  ('infinity_helmet', '무한의 투구', 'avatar', 500, '◆', '무한의 고리와 청보라 수정이 공격을 강화하는 희귀 투구입니다.', false, true, 'head', 'rare', 3, 'atk', 16, 'assets/items/equipment/item_infinity_helmet_rare.webp'),
  ('infinity_cape', '무한의 망토', 'avatar', 500, '◆', '무한의 고리와 청보라 수정이 공격을 강화하는 희귀 망토입니다.', false, true, 'back', 'rare', 3, 'atk', 16, 'assets/items/equipment/item_infinity_cape_rare.webp'),
  ('infinity_ring', '무한의 반지', 'avatar', 500, '◆', '무한의 고리와 청보라 수정이 공격을 강화하는 희귀 반지입니다. 오라 슬롯에 장착합니다.', false, true, 'aura', 'rare', 3, 'atk', 16, 'assets/items/equipment/item_infinity_ring_rare.webp'),
  ('infinity_armor', '무한의 갑옷', 'avatar', 500, '◆', '무한의 고리와 청보라 수정이 공격을 강화하는 희귀 갑옷입니다.', false, true, 'body', 'rare', 3, 'atk', 16, 'assets/items/equipment/item_infinity_armor_rare.webp'),
  ('infinity_staff', '무한의 지팡이', 'avatar', 800, '◆', '무한의 고리와 청보라 수정이 공격을 강화하는 희귀 지팡이입니다.', false, true, 'weapon', 'rare', 3, 'atk', 24, 'assets/items/equipment/item_infinity_staff_rare.webp')
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
