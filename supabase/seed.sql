-- Deterministic catalog data for local development. Production player data is
-- intentionally excluded.
insert into public.shop_items
  (code, name, category, price, icon, description, repeatable, slot, rarity, stars, stat_key, stat_value, art_path)
values
  ('dawn_blade', '새벽 결정검', 'avatar', 700, '◆', '수정 날개와 공명환이 공격의 빛을 모으는 유니크 결정검입니다.', false, 'weapon', 'unique', 4, 'atk', 16, 'assets/items/equipment/item_dawn_crystal_sword_unique.webp'),
  ('guardian_armor', '수호자의 결정 갑옷', 'avatar', 500, '◆', '맑은 은빛 판과 세 개의 수호 결정이 방어력을 높입니다.', false, 'body', 'rare', 3, 'def', 11, 'assets/items/equipment/item_guardian_crystal_armor_rare.webp'),
  ('crown', '별빛 왕관', 'avatar', 1200, '◆', '다섯 별의 축복으로 보물 발견의 행운을 높이는 왕관입니다.', false, 'head', 'legendary', 5, 'luk', 8, 'assets/items/equipment/item_starlight_crown_legendary.webp'),
  ('gale_boots', '질풍의 장화', 'avatar', 100, '◆', '첫 모험을 오래 이어갈 수 있도록 체력을 높이는 기본 장화입니다.', false, 'body', 'normal', 1, 'hp', 12, 'assets/items/equipment/item_gale_boots_normal.webp'),
  ('aura', '민트 기억 부적', 'avatar', 250, '◆', '새 단어를 기억할 때마다 마력을 채워 주는 특별한 부적입니다.', false, 'aura', 'special', 2, 'mp', 9, 'assets/items/equipment/item_mint_memory_charm_special.webp'),
  ('cape', '용기의 망토', 'avatar', 450, '◆', '수정 장식과 민트 안감이 모험가를 지켜 주는 희귀 망토입니다.', false, 'back', 'rare', 3, 'def', 7, 'assets/items/equipment/item_courage_cape_rare.webp'),
  ('wings', '하늘 결정 날개', 'avatar', 900, '◆', '민트빛 핵으로 움직이는 유니크 등 장비입니다.', false, 'back', 'unique', 4, 'luk', 6, 'assets/items/equipment/item_sky_crystal_wings_unique.webp'),
  ('pet', '워드 크리스털 정령', 'avatar', 1500, '◆', '배운 단어의 빛을 모아 행운을 가져오는 전설의 동행 정령입니다.', false, 'pet', 'legendary', 5, 'luk', 12, 'assets/items/equipment/item_word_crystal_sprite_legendary.webp'),
  ('ranger_violet_crystal_skin', '보랏빛 결정 궁수', 'avatar', 2000, '◆', '은보랏빛 트윈테일과 결정 장궁으로 모습을 바꾸는 여성 궁수 전용 스킨입니다.', false, 'skin', 'legendary', 5, null, 0, 'assets/avatars/skins/ranger-female-violet-crystal.webp'),
  ('snack', '간식 1개', 'gift', 60, '🍪', '보호자 승인 후 받을 수 있는 현실 선물입니다.', true, null, 'normal', 1, null, 0, ''),
  ('drink', '원하는 음료 1잔', 'gift', 90, '🥤', '보호자 승인 후 받을 수 있는 현실 선물입니다.', true, null, 'normal', 1, null, 0, ''),
  ('wish', '소원권 1회', 'gift', 150, '🎫', '보호자 승인 후 사용할 수 있는 현실 선물입니다.', true, null, 'normal', 1, null, 0, '')
on conflict (code) do update
set name = excluded.name,
    category = excluded.category,
    price = excluded.price,
    icon = excluded.icon,
    description = excluded.description,
    repeatable = excluded.repeatable,
    slot = excluded.slot,
    rarity = excluded.rarity,
    stars = excluded.stars,
    stat_key = excluded.stat_key,
    stat_value = excluded.stat_value,
    art_path = excluded.art_path,
    active = true;
