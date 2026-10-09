insert into public.shop_items
  (code, name, category, price, icon, description, repeatable, active, slot, rarity, stars, stat_key, stat_value, art_path)
values
  ('mage_starlight_rose_skin', '별빛 로즈 마법사', 'avatar', 400, '◆',
   '분홍 트윈테일과 별·초승달 장식을 두른 여성 마법사 전용 스킨입니다.',
   false, true, 'skin', 'legendary', 5, null, 0,
   'assets/avatars/skins/mage-female-starlight-rose.webp')
on conflict (code) do update
set name = excluded.name, category = excluded.category, price = excluded.price,
    icon = excluded.icon, description = excluded.description,
    repeatable = excluded.repeatable, active = excluded.active, slot = excluded.slot,
    rarity = excluded.rarity, stars = excluded.stars,
    stat_key = excluded.stat_key, stat_value = excluded.stat_value, art_path = excluded.art_path;

-- Extend the existing guards; all previously enforced skin restrictions remain.
create or replace function public.validate_skin_inventory_eligibility()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare v_code text; v_class text; v_variant text;
begin
  select si.code, gc.class, gc.avatar_variant into v_code, v_class, v_variant
  from public.shop_items si join public.game_characters gc on gc.id = new.character_id
  where si.id = new.item_id;
  if v_code = 'pugilist_crystal_noir_skin' and (v_class <> 'pugilist' or v_variant <> 'male') then raise exception 'male pugilist required'; end if;
  if v_code = 'mage_arcane_necromancer_skin' and (v_class <> 'mage' or v_variant <> 'male') then raise exception 'male mage required'; end if;
  if v_code = 'warrior_golden_radiance_skin' and (v_class <> 'warrior' or v_variant <> 'male') then raise exception 'male warrior required'; end if;
  if v_code = 'warrior_female_golden_radiance_skin' and (v_class <> 'warrior' or v_variant <> 'female') then raise exception 'female warrior required'; end if;
  if v_code = 'mage_starlight_rose_skin' and (v_class is distinct from 'mage' or v_variant is distinct from 'female') then raise exception 'female mage required'; end if;
  return new;
end;
$function$;

create or replace function public.validate_equipped_skin_eligibility()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare v_skin_item_id bigint; v_code text;
begin
  if not (new.equipped_items ? 'skin') then return new; end if;
  v_skin_item_id := nullif(new.equipped_items->>'skin', '')::bigint;
  select code into v_code from public.shop_items where id = v_skin_item_id;
  if v_code = 'pugilist_crystal_noir_skin' and (new.class <> 'pugilist' or new.avatar_variant <> 'male') then raise exception 'male pugilist required'; end if;
  if v_code = 'mage_arcane_necromancer_skin' and (new.class <> 'mage' or new.avatar_variant <> 'male') then raise exception 'male mage required'; end if;
  if v_code = 'warrior_golden_radiance_skin' and (new.class <> 'warrior' or new.avatar_variant <> 'male') then raise exception 'male warrior required'; end if;
  if v_code = 'warrior_female_golden_radiance_skin' and (new.class <> 'warrior' or new.avatar_variant <> 'female') then raise exception 'female warrior required'; end if;
  if v_code = 'mage_starlight_rose_skin' and (new.class is distinct from 'mage' or new.avatar_variant is distinct from 'female') then raise exception 'female mage required'; end if;
  return new;
end;
$function$;
