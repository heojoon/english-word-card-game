insert into public.shop_items
  (code, name, category, price, icon, description, repeatable, active, slot, rarity, stars, stat_key, stat_value, art_path)
values
  ('warrior_golden_radiance_skin', '황금빛 광휘의 검사', 'avatar', 2000, '◆',
   '황금 결정과 성광 대검을 든 남성 전사 전용 스킨입니다. 전용 대검 공격과 피격/쓰러짐 애니메이션이 적용됩니다.',
   false, true, 'skin', 'legendary', 5, null, 0,
   'assets/avatars/skins/warrior-male-golden-radiance.webp')
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

create or replace function public.validate_skin_inventory_eligibility()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_code text;
  v_class text;
  v_variant text;
begin
  select si.code, gc.class, gc.avatar_variant
    into v_code, v_class, v_variant
  from public.shop_items si
  join public.game_characters gc on gc.id = new.character_id
  where si.id = new.item_id;

  if v_code = 'mage_arcane_necromancer_skin'
     and (v_class <> 'mage' or v_variant <> 'male') then
    raise exception 'male mage required';
  end if;
  if v_code = 'warrior_golden_radiance_skin'
     and (v_class <> 'warrior' or v_variant <> 'male') then
    raise exception 'male warrior required';
  end if;
  return new;
end;
$function$;

create or replace function public.validate_equipped_skin_eligibility()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_skin_item_id bigint;
  v_code text;
begin
  if not (new.equipped_items ? 'skin') then return new; end if;
  v_skin_item_id := nullif(new.equipped_items->>'skin', '')::bigint;
  select code into v_code from public.shop_items where id = v_skin_item_id;
  if v_code = 'mage_arcane_necromancer_skin'
     and (new.class <> 'mage' or new.avatar_variant <> 'male') then
    raise exception 'male mage required';
  end if;
  if v_code = 'warrior_golden_radiance_skin'
     and (new.class <> 'warrior' or new.avatar_variant <> 'male') then
    raise exception 'male warrior required';
  end if;
  return new;
end;
$function$;
