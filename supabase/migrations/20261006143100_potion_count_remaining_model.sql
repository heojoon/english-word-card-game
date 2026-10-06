alter table public.story_potion_inventory
  add column potion_count_model text not null default 'total'
  check (potion_count_model in ('total','remaining'));

create or replace function public.get_story_potion_inventory(p_character_id uuid)
returns table(red_potion_count integer,blue_potion_count integer,equipped_slot_1 text,equipped_slot_2 text)
language plpgsql security definer set search_path = '' as $function$
declare v_owner uuid;
begin
  select c.owner_user_id into v_owner from public.game_characters c where c.id=p_character_id;
  if not found or (v_owner is not null and auth.uid() is distinct from v_owner)
    or (v_owner is null and auth.uid() is not null) then
    raise exception 'character not found';
  end if;
  return query
    select
      coalesce(case when i.potion_count_model='total'
        then greatest(0,i.red_potion_count
          -(case when i.equipped_slot_1='red' then 1 else 0 end)
          -(case when i.equipped_slot_2='red' then 1 else 0 end))
        else i.red_potion_count end,0),
      coalesce(case when i.potion_count_model='total'
        then greatest(0,i.blue_potion_count
          -(case when i.equipped_slot_1='blue' then 1 else 0 end)
          -(case when i.equipped_slot_2='blue' then 1 else 0 end))
        else i.blue_potion_count end,0),
      i.equipped_slot_1,i.equipped_slot_2
    from (select p_character_id as character_id) c
    left join public.story_potion_inventory i on i.character_id=c.character_id;
end $function$;

create or replace function public.equip_story_potions(p_character_id uuid,p_slots text[])
returns table(red_potion_count integer,blue_potion_count integer,equipped_slot_1 text,equipped_slot_2 text)
language plpgsql security definer set search_path = '' as $function$
declare
  v_owner uuid;
  v_red integer:=0;
  v_blue integer:=0;
  v_model text:='remaining';
  v_old_slot_1 text;
  v_old_slot_2 text;
  v_slots text[]:=coalesce(p_slots,array[null::text,null::text]);
begin
  select c.owner_user_id into v_owner
    from public.game_characters c where c.id=p_character_id for update;
  if not found or (v_owner is not null and auth.uid() is distinct from v_owner)
    or (v_owner is null and auth.uid() is not null) then
    raise exception 'character not found';
  end if;
  if cardinality(v_slots)<>2 or exists(
    select 1 from unnest(v_slots) as u(value)
    where value is not null and value not in ('red','blue')
  ) then raise exception 'invalid potion slots'; end if;

  select coalesce(i.red_potion_count,0),coalesce(i.blue_potion_count,0),
      i.potion_count_model,i.equipped_slot_1,i.equipped_slot_2
    into v_red,v_blue,v_model,v_old_slot_1,v_old_slot_2
    from public.story_potion_inventory i
    where i.character_id=p_character_id for update;
  if not found then
    v_red:=0;v_blue:=0;v_model:='remaining';v_old_slot_1:=null;v_old_slot_2:=null;
  elsif v_model='total' then
    v_red:=greatest(0,v_red
      -(case when v_old_slot_1='red' then 1 else 0 end)
      -(case when v_old_slot_2='red' then 1 else 0 end));
    v_blue:=greatest(0,v_blue
      -(case when v_old_slot_1='blue' then 1 else 0 end)
      -(case when v_old_slot_2='blue' then 1 else 0 end));
  end if;

  v_red:=v_red
    +(case when v_old_slot_1='red' then 1 else 0 end)
    +(case when v_old_slot_2='red' then 1 else 0 end)
    -(case when v_slots[1]='red' then 1 else 0 end)
    -(case when v_slots[2]='red' then 1 else 0 end);
  v_blue:=v_blue
    +(case when v_old_slot_1='blue' then 1 else 0 end)
    +(case when v_old_slot_2='blue' then 1 else 0 end)
    -(case when v_slots[1]='blue' then 1 else 0 end)
    -(case when v_slots[2]='blue' then 1 else 0 end);
  if v_red<0 or v_blue<0 then raise exception 'insufficient potion inventory'; end if;

  insert into public.story_potion_inventory(character_id,red_potion_count,blue_potion_count,
    equipped_slot_1,equipped_slot_2,potion_count_model)
    values(p_character_id,v_red,v_blue,v_slots[1],v_slots[2],'remaining')
    on conflict (character_id) do update set
      red_potion_count=excluded.red_potion_count,
      blue_potion_count=excluded.blue_potion_count,
      equipped_slot_1=excluded.equipped_slot_1,
      equipped_slot_2=excluded.equipped_slot_2,
      potion_count_model='remaining';
  return query select v_red,v_blue,v_slots[1],v_slots[2];
end $function$;

revoke all on function public.get_story_potion_inventory(uuid) from public;
revoke all on function public.equip_story_potions(uuid,text[]) from public;
grant execute on function public.get_story_potion_inventory(uuid) to anon,authenticated;
grant execute on function public.equip_story_potions(uuid,text[]) to anon,authenticated;
