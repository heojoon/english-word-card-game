create function public.use_story_potion(p_character_id uuid, p_slot_index integer)
returns jsonb
language plpgsql security definer set search_path = '' as $function$
declare
  v_owner uuid;
  v_type text;
  v_red integer;
  v_blue integer;
  v_model text;
  v_slot_1 text;
  v_slot_2 text;
begin
  if p_slot_index is null or p_slot_index not in (1, 2) then
    raise exception 'invalid potion slot';
  end if;

  select c.owner_user_id into v_owner
    from public.game_characters c where c.id = p_character_id for update;
  if not found or (v_owner is not null and auth.uid() is distinct from v_owner)
    or (v_owner is null and auth.uid() is not null) then
    raise exception 'character not found';
  end if;

  select i.red_potion_count, i.blue_potion_count, i.potion_count_model,
      i.equipped_slot_1, i.equipped_slot_2
    into v_red, v_blue, v_model, v_slot_1, v_slot_2
    from public.story_potion_inventory i
    where i.character_id = p_character_id for update;
  if not found then raise exception 'potion not equipped'; end if;
  v_type := case when p_slot_index = 1 then v_slot_1 else v_slot_2 end;
  if v_type is null then raise exception 'potion not equipped'; end if;

  if v_model = 'total' then
    v_red := greatest(0, v_red - case when v_slot_1 = 'red' then 1 else 0 end
      - case when v_slot_2 = 'red' then 1 else 0 end);
    v_blue := greatest(0, v_blue - case when v_slot_1 = 'blue' then 1 else 0 end
      - case when v_slot_2 = 'blue' then 1 else 0 end);
  end if;
  if p_slot_index = 1 then v_slot_1 := null; else v_slot_2 := null; end if;

  update public.story_potion_inventory set
    red_potion_count = v_red,
    blue_potion_count = v_blue,
    equipped_slot_1 = v_slot_1,
    equipped_slot_2 = v_slot_2,
    potion_count_model = 'remaining'
    where character_id = p_character_id;

  return jsonb_build_object(
    'type', v_type,
    'red_potion_count', v_red,
    'blue_potion_count', v_blue,
    'equipped_slot_1', v_slot_1,
    'equipped_slot_2', v_slot_2
  );
end $function$;

revoke all on function public.use_story_potion(uuid, integer) from public, anon, authenticated;
grant execute on function public.use_story_potion(uuid, integer) to anon, authenticated;
