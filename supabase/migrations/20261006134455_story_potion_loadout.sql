alter table public.story_potion_inventory
  add column blue_potion_count integer not null default 0 check (blue_potion_count >= 0),
  add column equipped_slot_1 text check (equipped_slot_1 in ('red','blue')),
  add column equipped_slot_2 text check (equipped_slot_2 in ('red','blue'));

create or replace function public.get_story_potion_inventory(p_character_id uuid)
returns table(red_potion_count integer,blue_potion_count integer,equipped_slot_1 text,equipped_slot_2 text)
language plpgsql security definer set search_path = '' as $function$
declare v_owner uuid;
begin
  select c.owner_user_id into v_owner
    from public.game_characters c where c.id=p_character_id;
  if not found or (v_owner is not null and auth.uid() is distinct from v_owner)
    or (v_owner is null and auth.uid() is not null) then
    raise exception 'character not found';
  end if;
  return query
    select coalesce(i.red_potion_count,0),coalesce(i.blue_potion_count,0),
      i.equipped_slot_1,i.equipped_slot_2
    from (select p_character_id as character_id) c
    left join public.story_potion_inventory i on i.character_id=c.character_id;
end $function$;

create or replace function public.equip_story_potions(p_character_id uuid,p_slots text[])
returns table(red_potion_count integer,blue_potion_count integer,equipped_slot_1 text,equipped_slot_2 text)
language plpgsql security definer set search_path = '' as $function$
declare
  v_owner uuid;
  v_red integer;
  v_blue integer;
  v_slots text[]:=coalesce(p_slots,array[null::text,null::text]);
begin
  select c.owner_user_id into v_owner
    from public.game_characters c where c.id=p_character_id for update;
  if not found or (v_owner is not null and auth.uid() is distinct from v_owner)
    or (v_owner is null and auth.uid() is not null) then
    raise exception 'character not found';
  end if;
  if cardinality(v_slots)<>2 or exists(
    select 1 from unnest(v_slots) as u(value) where value is not null and value not in ('red','blue')
  ) then raise exception 'invalid potion slots'; end if;

  select coalesce(i.red_potion_count,0),coalesce(i.blue_potion_count,0)
    into v_red,v_blue from public.story_potion_inventory i
    where i.character_id=p_character_id for update;
  if not found then v_red:=0;v_blue:=0; end if;
  if (select count(*) from unnest(v_slots) as u(value) where value='red')>v_red
    or (select count(*) from unnest(v_slots) as u(value) where value='blue')>v_blue then
    raise exception 'insufficient potion inventory';
  end if;

  insert into public.story_potion_inventory(character_id,red_potion_count,blue_potion_count,equipped_slot_1,equipped_slot_2)
    values(p_character_id,v_red,v_blue,v_slots[1],v_slots[2])
    on conflict (character_id) do update set
      equipped_slot_1=excluded.equipped_slot_1,equipped_slot_2=excluded.equipped_slot_2;
  return query select v_red,v_blue,v_slots[1],v_slots[2];
end $function$;

revoke all on function public.get_story_potion_inventory(uuid) from public;
revoke all on function public.equip_story_potions(uuid,text[]) from public;
grant execute on function public.get_story_potion_inventory(uuid) to anon,authenticated;
grant execute on function public.equip_story_potions(uuid,text[]) to anon,authenticated;
