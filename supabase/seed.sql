-- Deterministic catalog data for local development. Production player data is
-- intentionally excluded.
insert into public.shop_items (code, name, category, price, icon, description, repeatable)
values
  ('crown', '황금 왕관', 'avatar', 30, '👑', '캐릭터 머리 위에 황금 왕관을 장착합니다.', false),
  ('cape', '불꽃 망토', 'avatar', 40, '🧥', '모험가의 불꽃 망토 장식입니다.', false),
  ('aura', '별빛 오라', 'avatar', 50, '✨', '캐릭터 주변에 별빛 오라를 표시합니다.', false),
  ('wings', '천사 날개', 'avatar', 70, '🪽', '캐릭터에 날개 장식을 추가합니다.', false),
  ('snack', '간식 1개', 'gift', 60, '🍪', '보호자 승인 후 받을 수 있는 현실 선물입니다.', true),
  ('drink', '원하는 음료 1잔', 'gift', 90, '🥤', '보호자 승인 후 받을 수 있는 현실 선물입니다.', true),
  ('wish', '소원권 1회', 'gift', 150, '🎫', '보호자 승인 후 사용할 수 있는 현실 선물입니다.', true)
on conflict (code) do update
set name = excluded.name,
    category = excluded.category,
    price = excluded.price,
    icon = excluded.icon,
    description = excluded.description,
    repeatable = excluded.repeatable,
    active = true;
