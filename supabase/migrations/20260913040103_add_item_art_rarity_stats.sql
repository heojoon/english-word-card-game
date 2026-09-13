alter table public.shop_items
  add column if not exists slot text,
  add column if not exists rarity text not null default 'normal',
  add column if not exists stars smallint not null default 1,
  add column if not exists stat_key text,
  add column if not exists stat_value integer not null default 0,
  add column if not exists art_path text not null default '';

alter table public.shop_items
  add constraint shop_items_slot_check
    check (slot is null or slot in ('head', 'body', 'weapon', 'back', 'aura', 'pet')),
  add constraint shop_items_rarity_check
    check (rarity in ('normal', 'special', 'rare', 'unique', 'legendary')),
  add constraint shop_items_stars_check
    check (stars between 1 and 5),
  add constraint shop_items_stat_key_check
    check (stat_key is null or stat_key in ('hp', 'mp', 'atk', 'def', 'luk')),
  add constraint shop_items_stat_value_check
    check (stat_value >= 0);

insert into public.shop_items
  (code, name, category, price, icon, description, repeatable, active, slot, rarity, stars, stat_key, stat_value, art_path)
values
  ('dawn_blade', '새벽 결정검', 'avatar', 700, '◆', '수정 날개와 공명환이 공격의 빛을 모으는 유니크 결정검입니다.', false, true, 'weapon', 'unique', 4, 'atk', 16, 'assets/items/equipment/item_dawn_crystal_sword_unique.webp'),
  ('guardian_armor', '수호자의 결정 갑옷', 'avatar', 500, '◆', '맑은 은빛 판과 세 개의 수호 결정이 방어력을 높입니다.', false, true, 'body', 'rare', 3, 'def', 11, 'assets/items/equipment/item_guardian_crystal_armor_rare.webp'),
  ('crown', '별빛 왕관', 'avatar', 1200, '◆', '다섯 별의 축복으로 보물 발견의 행운을 높이는 왕관입니다.', false, true, 'head', 'legendary', 5, 'luk', 8, 'assets/items/equipment/item_starlight_crown_legendary.webp'),
  ('gale_boots', '질풍의 장화', 'avatar', 100, '◆', '첫 모험을 오래 이어갈 수 있도록 체력을 높이는 기본 장화입니다.', false, true, 'body', 'normal', 1, 'hp', 12, 'assets/items/equipment/item_gale_boots_normal.webp'),
  ('aura', '민트 기억 부적', 'avatar', 250, '◆', '새 단어를 기억할 때마다 마력을 채워 주는 특별한 부적입니다.', false, true, 'aura', 'special', 2, 'mp', 9, 'assets/items/equipment/item_mint_memory_charm_special.webp'),
  ('cape', '용기의 망토', 'avatar', 450, '◆', '수정 장식과 민트 안감이 모험가를 지켜 주는 희귀 망토입니다.', false, true, 'back', 'rare', 3, 'def', 7, 'assets/items/equipment/item_courage_cape_rare.webp'),
  ('wings', '하늘 결정 날개', 'avatar', 900, '◆', '민트빛 핵으로 움직이는 유니크 등 장비입니다.', false, true, 'back', 'unique', 4, 'luk', 6, 'assets/items/equipment/item_sky_crystal_wings_unique.webp'),
  ('pet', '워드 크리스털 정령', 'avatar', 1500, '◆', '배운 단어의 빛을 모아 행운을 가져오는 전설의 동행 정령입니다.', false, true, 'pet', 'legendary', 5, 'luk', 12, 'assets/items/equipment/item_word_crystal_sprite_legendary.webp')
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

create or replace function public.equip_avatar_slot(
  p_character_id uuid,
  p_item_id bigint,
  p_slot text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_items jsonb;
  v_expected_slot text;
begin
  if p_slot not in ('head', 'body', 'weapon', 'back', 'aura', 'pet') then
    raise exception 'invalid equipment slot';
  end if;

  select equipped_items into v_items
  from public.game_characters
  where id = p_character_id
  for update;
  if v_items is null then raise exception 'character not found'; end if;

  if p_item_id is null then
    v_items := v_items - p_slot;
  else
    select slot into v_expected_slot
    from public.shop_items
    where id = p_item_id and category = 'avatar' and active = true;
    if v_expected_slot is null or v_expected_slot <> p_slot then
      raise exception 'item does not fit slot';
    end if;
    if not exists (
      select 1 from public.character_inventory
      where character_id = p_character_id and item_id = p_item_id
    ) then
      raise exception 'item not owned';
    end if;
    v_items := jsonb_set(v_items, array[p_slot], to_jsonb(p_item_id), true);
  end if;

  update public.game_characters
  set equipped_items = v_items,
      equipped_item_id = p_item_id
  where id = p_character_id;
  return v_items;
end;
$function$;

grant execute on function public.equip_avatar_slot(uuid, bigint, text) to anon, authenticated;
