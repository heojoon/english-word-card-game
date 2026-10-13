-- Preserve the existing Word Crystal Spirit and its hidden-boss ownership condition.
insert into public.shop_items
(code, name, category, price, icon, description, repeatable, active, slot, rarity, stars, stat_key, stat_value, art_path)
values
('pet_pebble_slime', '조약돌 슬라임', 'avatar', 220, '◆', '단단한 껍질 · 6% 확률 · 다음 피격 피해 1회 방어', false, true, 'pet', 'normal', 1, 'luk', 5, 'assets/items/concepts/pet_pebble_slime.png'),
('pet_mint_sparrow', '민트 참새', 'avatar', 660, '◆', '민트빛 날갯짓 · 6% 확률 · 제한시간 3초 정지', false, true, 'pet', 'normal', 1, 'luk', 7, 'assets/items/concepts/pet_mint_sparrow.png'),
('pet_paperboat_rabbit', '종이배 토끼', 'avatar', 770, '◆', '행운의 종이배 · 6% 확률 · MP 1 회복', false, true, 'pet', 'normal', 1, 'luk', 8, 'assets/items/concepts/pet_paperboat_rabbit.png'),
('pet_sparktail_fox', '반짝꼬리 여우', 'avatar', 880, '◆', '반짝꼬리 회복술 · 6% 확률 · HP 1 회복', false, true, 'pet', 'normal', 1, 'luk', 10, 'assets/items/concepts/pet_sparktail_fox.png'),
('pet_cloudbubble_cat', '구름방울 고양이', 'avatar', 990, '◆', '구름 휴식 · 6% 확률 · 제한시간 3초 정지', false, true, 'pet', 'normal', 1, 'luk', 12, 'assets/items/concepts/pet_cloudbubble_cat.png'),
('pet_glass_shell_snail', '유리껍질 달팽이', 'avatar', 1500, '◆', '투명 방벽 · 6% 확률 · 다음 피격 피해 1회 방어', false, true, 'pet', 'normal', 1, 'luk', 14, 'assets/items/concepts/pet_glass_shell_snail.png'),
('pet_blue_ribbon_owl', '파란리본 올빼미', 'avatar', 2000, '◆', '야간비행 · 10% 확률 · 다음 피격 피해 1회 방어', false, true, 'pet', 'normal', 1, 'luk', 16, 'assets/items/concepts/pet_blue_ribbon_owl.png'),
('pet_bookbud_squirrel', '책송이 다람쥐', 'avatar', 2500, '◆', '도토리나누기 · 10% 확률 · MP 1 회복', false, true, 'pet', 'normal', 1, 'luk', 18, 'assets/items/concepts/pet_bookbud_squirrel.png'),
('pet_mist_horn_deer', '안개뿔 사슴', 'avatar', 3000, '◆', '나무의축복 · 10% 확률 · HP 1 회복', false, true, 'pet', 'normal', 1, 'luk', 21, 'assets/items/concepts/pet_mist_horn_deer.png'),
('pet_prism_guardian_dragon', '프리즘 수호룡', 'avatar', 4000, '◆', '드래곤하트 · 10% 확률 · HP 0일 때 HP 1로 부활 · 전투당 부활 1회', false, true, 'pet', 'normal', 1, 'luk', 25, 'assets/items/concepts/pet_prism_guardian_dragon.png')
on conflict (code) do update set
name=excluded.name, category=excluded.category, price=excluded.price,
icon=excluded.icon, description=excluded.description, repeatable=excluded.repeatable,
active=excluded.active, slot=excluded.slot, rarity=excluded.rarity, stars=excluded.stars,
stat_key=excluded.stat_key, stat_value=excluded.stat_value, art_path=excluded.art_path;
