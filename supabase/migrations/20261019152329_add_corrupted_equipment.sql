-- Special corrupted equipment. Existing purchases and equipment stay intact.
insert into public.shop_items
  (code, name, category, price, icon, description, repeatable, active, slot, rarity, stars, stat_key, stat_value, art_path)
values
  ('corrupted_sword', '타락한 검', 'avatar', 250, '◆', '타락의 힘을 두른 검으로, 상대방을 쓰러트리기 위해 공격에 특화된 장비입니다.', false, true, 'weapon', 'special', 2, 'atk', 9, 'assets/items/equipment/item_corrupted_sword_special.webp'),
  ('corrupted_boots', '타락한 장화', 'avatar', 250, '◆', '타락의 힘을 두른 장화로, 상대방을 쓰러트리기 위해 공격에 특화된 장비입니다.', false, true, 'feet', 'special', 2, 'atk', 9, 'assets/items/equipment/item_corrupted_boots_special.webp'),
  ('corrupted_helmet', '타락한 투구', 'avatar', 250, '◆', '타락의 힘을 두른 투구로, 상대방을 쓰러트리기 위해 공격에 특화된 장비입니다.', false, true, 'head', 'special', 2, 'atk', 8, 'assets/items/equipment/item_corrupted_helmet_special.webp'),
  ('corrupted_cape', '타락의 망토', 'avatar', 250, '◆', '타락의 힘을 두른 망토로, 상대방을 쓰러트리기 위해 공격에 특화된 장비입니다.', false, true, 'back', 'special', 2, 'atk', 8, 'assets/items/equipment/item_corrupted_cape_special.webp'),
  ('corrupted_ring', '타락의 반지', 'avatar', 250, '◆', '타락의 힘을 두른 반지로, 상대방을 쓰러트리기 위해 공격에 특화된 장비입니다.', false, true, 'aura', 'special', 2, 'atk', 8, 'assets/items/equipment/item_corrupted_ring_special.webp'),
  ('corrupted_armor', '타락한 갑옷', 'avatar', 250, '◆', '타락의 힘을 두른 갑옷으로, 상대방을 쓰러트리기 위해 공격에 특화된 장비입니다.', false, true, 'body', 'special', 2, 'atk', 8, 'assets/items/equipment/item_corrupted_armor_special.webp'),
  ('corrupted_staff', '타락한 지팡이', 'avatar', 400, '◆', '타락의 힘을 두른 지팡이로, 상대방을 쓰러트리기 위해 공격에 특화된 장비입니다.', false, true, 'weapon', 'special', 2, 'atk', 11, 'assets/items/equipment/item_corrupted_staff_special.webp')
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
