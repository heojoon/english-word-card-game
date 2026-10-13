-- Preserve prices, stats, inventory and the spirit's hidden-boss access condition.
update public.shop_items
set rarity='legendary', stars=5
where code in ('pet_prism_guardian_dragon','pet_mist_horn_deer');

update public.shop_items
set rarity='unique', stars=4
where slot='pet' and rarity='normal';

update public.shop_items
set description='정령의 속삭임 · 8% 확률 · 정답 하나 알려주기'
where code='pet';
