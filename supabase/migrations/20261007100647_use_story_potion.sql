create or replace function public.use_story_potion(p_character_id uuid,p_slot_index integer)
returns text
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
  select c.owner_user_id into v_owner
    from public.game_characters c where c.id=p_character_id for update;
  if not found or (v_owner is not null and auth.uid() is distinct from v_owner)
    or (v_owner is null and auth.uid() is not null) then
    raise exception 'character not found';
  end if;
  if p_slot_index is null or p_slot_index not in (1,2) then raise exception 'invalid potion slot'; end if;

  select case when p_slot_index=1 then i.equipped_slot_1 else i.equipped_slot_2 end,
      i.red_potion_count,i.blue_potion_count,i.potion_count_model,
      i.equipped_slot_1,i.equipped_slot_2
    into v_type,v_red,v_blue,v_model,v_slot_1,v_slot_2
    from public.story_potion_inventory i
    where i.character_id=p_character_id for update;
  if not found then raise exception 'potion not equipped'; end if;
  if v_type is null then raise exception 'potion not equipped'; end if;
  if v_model='total' then
    v_red:=greatest(0,v_red-(case when v_slot_1='red' then 1 else 0 end)-(case when v_slot_2='red' then 1 else 0 end));
    v_blue:=greatest(0,v_blue-(case when v_slot_1='blue' then 1 else 0 end)-(case when v_slot_2='blue' then 1 else 0 end));
  end if;
  update public.story_potion_inventory set
    red_potion_count=v_red,
    blue_potion_count=v_blue,
    equipped_slot_1=case when p_slot_index=1 then null else equipped_slot_1 end,
    equipped_slot_2=case when p_slot_index=2 then null else equipped_slot_2 end,
    potion_count_model='remaining'
    where character_id=p_character_id;
  return v_type;
end $function$;

revoke all on function public.use_story_potion(uuid,integer) from public;
grant execute on function public.use_story_potion(uuid,integer) to anon,authenticated;
