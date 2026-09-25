alter table public.shop_items
  drop constraint if exists shop_items_slot_check;

alter table public.shop_items
  add constraint shop_items_slot_check
    check (slot is null or slot in ('skin', 'head', 'body', 'weapon', 'feet', 'back', 'aura', 'pet'));

update public.shop_items set slot = 'feet' where code = 'gale_boots';

update public.game_characters as character
set equipped_items = (character.equipped_items - 'body')
  || jsonb_build_object('feet', character.equipped_items->'body')
from public.shop_items as item
where item.code = 'gale_boots'
  and character.equipped_items->>'body' = item.id::text;

create or replace function public.equip_avatar_slot(p_character_id uuid, p_item_id bigint, p_slot text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_character public.game_characters%rowtype;
  v_items jsonb;
  v_item public.shop_items%rowtype;
  v_request_user_id uuid := auth.uid();
begin
  if p_slot not in ('skin', 'head', 'body', 'weapon', 'feet', 'back', 'aura', 'pet') then
    raise exception 'invalid equipment slot';
  end if;

  select * into v_character from public.game_characters where id = p_character_id for update;
  if v_character.id is null then raise exception 'character not found'; end if;
  if v_character.owner_user_id is not null then
    if v_request_user_id is distinct from v_character.owner_user_id then raise exception 'character not found'; end if;
  elsif v_request_user_id is not null then
    raise exception 'character not found';
  end if;
  v_items := coalesce(v_character.equipped_items, '{}'::jsonb);

  if p_item_id is null then
    v_items := v_items - p_slot;
  else
    select * into v_item from public.shop_items
    where id = p_item_id and category = 'avatar' and active = true;
    if v_item.id is null or v_item.slot is distinct from p_slot then raise exception 'item does not fit slot'; end if;
    if v_item.code = 'ranger_violet_crystal_skin'
       and (v_character.class <> 'ranger' or v_character.avatar_variant <> 'female') then raise exception 'female ranger required'; end if;
    if v_item.code = 'pugilist_crystal_rose_skin'
       and (v_character.class <> 'pugilist' or v_character.avatar_variant <> 'female') then raise exception 'female pugilist required'; end if;
    if v_item.code = 'mage_arcane_necromancer_skin'
       and (v_character.class <> 'mage' or v_character.avatar_variant <> 'male') then raise exception 'male mage required'; end if;
    if not exists (
      select 1 from public.character_inventory where character_id = p_character_id and item_id = p_item_id
    ) then raise exception 'item not owned'; end if;
    v_items := jsonb_set(v_items, array[p_slot], to_jsonb(p_item_id), true);
  end if;

  update public.game_characters
  set equipped_items = v_items, equipped_item_id = p_item_id
  where id = p_character_id;
  return v_items;
end;
$function$;

revoke all on function public.equip_avatar_slot(uuid, bigint, text) from public;
grant execute on function public.equip_avatar_slot(uuid, bigint, text) to anon, authenticated;
