-- Gold potion restores both HP and MP to maximum for 190 crystals.
alter table public.story_potion_inventory
  add column gold_potion_count integer not null default 0 check (gold_potion_count >= 0);
alter table public.story_potion_inventory drop constraint if exists story_potion_inventory_equipped_slot_1_check;
alter table public.story_potion_inventory drop constraint if exists story_potion_inventory_equipped_slot_2_check;
alter table public.story_potion_inventory add constraint story_potion_inventory_equipped_slot_1_check check (equipped_slot_1 in ('red','blue','gold'));
alter table public.story_potion_inventory add constraint story_potion_inventory_equipped_slot_2_check check (equipped_slot_2 in ('red','blue','gold'));

drop function public.get_story_potion_inventory(uuid);
drop function public.equip_story_potions(uuid,text[]);
drop function public.purchase_story_potion(uuid,text);

create or replace function public.get_story_potion_inventory(p_character_id uuid)
returns table(red_potion_count integer,blue_potion_count integer,gold_potion_count integer,equipped_slot_1 text,equipped_slot_2 text)
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
      coalesce(i.gold_potion_count,0),i.equipped_slot_1,i.equipped_slot_2
    from (select p_character_id as character_id) c
    left join public.story_potion_inventory i on i.character_id=c.character_id;
end $function$;

create or replace function public.equip_story_potions(p_character_id uuid,p_slots text[])
returns table(red_potion_count integer,blue_potion_count integer,gold_potion_count integer,equipped_slot_1 text,equipped_slot_2 text)
language plpgsql security definer set search_path = '' as $function$
declare
  v_owner uuid;
  v_red integer:=0;
  v_blue integer:=0;
  v_gold integer:=0;
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
    where value is not null and value not in ('red','blue','gold')
  ) then raise exception 'invalid potion slots'; end if;

  select coalesce(i.red_potion_count,0),coalesce(i.blue_potion_count,0),coalesce(i.gold_potion_count,0),
      i.potion_count_model,i.equipped_slot_1,i.equipped_slot_2
    into v_red,v_blue,v_gold,v_model,v_old_slot_1,v_old_slot_2
    from public.story_potion_inventory i
    where i.character_id=p_character_id for update;
  if not found then
    v_red:=0;v_blue:=0;v_gold:=0;v_model:='remaining';v_old_slot_1:=null;v_old_slot_2:=null;
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
  v_gold:=v_gold
    +(case when v_old_slot_1='gold' then 1 else 0 end)
    +(case when v_old_slot_2='gold' then 1 else 0 end)
    -(case when v_slots[1]='gold' then 1 else 0 end)
    -(case when v_slots[2]='gold' then 1 else 0 end);
  if v_red<0 or v_blue<0 or v_gold<0 then raise exception 'insufficient potion inventory'; end if;

  insert into public.story_potion_inventory(character_id,red_potion_count,blue_potion_count,gold_potion_count,
    equipped_slot_1,equipped_slot_2,potion_count_model)
    values(p_character_id,v_red,v_blue,v_gold,v_slots[1],v_slots[2],'remaining')
    on conflict (character_id) do update set
      red_potion_count=excluded.red_potion_count,
      blue_potion_count=excluded.blue_potion_count,
      gold_potion_count=excluded.gold_potion_count,
      equipped_slot_1=excluded.equipped_slot_1,
      equipped_slot_2=excluded.equipped_slot_2,
      potion_count_model='remaining';
  return query select v_red,v_blue,v_gold,v_slots[1],v_slots[2];
end $function$;

revoke all on function public.get_story_potion_inventory(uuid) from public;
revoke all on function public.equip_story_potions(uuid,text[]) from public;
grant execute on function public.get_story_potion_inventory(uuid) to anon,authenticated;
grant execute on function public.equip_story_potions(uuid,text[]) to anon,authenticated;

create or replace function public.purchase_story_potion(p_character_id uuid,p_potion_type text)
returns table(new_balance integer,red_potion_count integer,blue_potion_count integer,gold_potion_count integer)
language plpgsql security definer set search_path = '' as $function$
declare
  v_character public.game_characters%rowtype;
  v_balance integer;
  v_red integer;
  v_blue integer;
  v_gold integer;
  v_price integer;
begin
  if p_potion_type is null or p_potion_type not in ('red','blue','gold') then
    raise exception 'invalid potion type';
  end if;
  select * into v_character from public.game_characters c
    where c.id=p_character_id for update;
  if not found or (v_character.owner_user_id is not null and auth.uid() is distinct from v_character.owner_user_id)
    or (v_character.owner_user_id is null and auth.uid() is not null) then
    raise exception 'character not found';
  end if;

  if v_character.owner_user_id is not null then
    select p.crystal_balance into v_balance from public.profiles p
      where p.user_id=v_character.owner_user_id for update;
  else
    v_balance:=v_character.coins;
  end if;
  v_price:=case when p_potion_type='gold' then 190 else 20 end;
  if coalesce(v_balance,0)<v_price then raise exception 'not enough crystals'; end if;

  if v_character.owner_user_id is not null then
    update public.profiles p set crystal_balance=p.crystal_balance-v_price,updated_at=now()
      where p.user_id=v_character.owner_user_id returning p.crystal_balance into v_balance;
  else
    update public.game_characters c set coins=c.coins-v_price
      where c.id=p_character_id returning c.coins into v_balance;
  end if;

  insert into public.story_potion_inventory(character_id,red_potion_count,blue_potion_count,gold_potion_count)
    values(p_character_id,case when p_potion_type='red' then 1 else 0 end,
      case when p_potion_type='blue' then 1 else 0 end,
      case when p_potion_type='gold' then 1 else 0 end)
    on conflict (character_id) do update set
      red_potion_count=public.story_potion_inventory.red_potion_count+
        case when p_potion_type='red' then 1 else 0 end,
      blue_potion_count=public.story_potion_inventory.blue_potion_count+
        case when p_potion_type='blue' then 1 else 0 end,
      gold_potion_count=public.story_potion_inventory.gold_potion_count+
        case when p_potion_type='gold' then 1 else 0 end
    returning public.story_potion_inventory.red_potion_count,
      public.story_potion_inventory.blue_potion_count,
      public.story_potion_inventory.gold_potion_count into v_red,v_blue,v_gold;

  insert into public.coin_ledger(character_id,amount,reason)
    values(p_character_id,-v_price,'potion_purchase');
  return query select v_balance,v_red,v_blue,v_gold;
end $function$;

revoke all on function public.purchase_story_potion(uuid,text) from public;
grant execute on function public.purchase_story_potion(uuid,text) to anon,authenticated;

create or replace function public.use_story_potion(p_character_id uuid, p_slot_index integer)
returns jsonb
language plpgsql security definer set search_path = '' as $function$
declare
  v_owner uuid;
  v_type text;
  v_red integer;
  v_blue integer;
  v_gold integer;
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

  select i.red_potion_count, i.blue_potion_count, i.gold_potion_count, i.potion_count_model,
      i.equipped_slot_1, i.equipped_slot_2
    into v_red, v_blue, v_gold, v_model, v_slot_1, v_slot_2
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
    gold_potion_count = v_gold,
    equipped_slot_1 = v_slot_1,
    equipped_slot_2 = v_slot_2,
    potion_count_model = 'remaining'
    where character_id = p_character_id;

  return jsonb_build_object(
    'type', v_type,
    'red_potion_count', v_red,
    'blue_potion_count', v_blue,
    'gold_potion_count', v_gold,
    'equipped_slot_1', v_slot_1,
    'equipped_slot_2', v_slot_2
  );
end $function$;

revoke all on function public.use_story_potion(uuid, integer) from public, anon, authenticated;
grant execute on function public.use_story_potion(uuid, integer) to anon, authenticated;

-- One sale consumes one owned copy and credits its owner in one transaction.
create or replace function public.sell_owned_item(
  p_character_id uuid, p_item_id bigint default null, p_potion_type text default null
)
returns table(sale_price integer,new_balance integer,remaining_count integer)
language plpgsql security definer set search_path = '' as $function$
declare
  v_character public.game_characters%rowtype;
  v_potions public.story_potion_inventory%rowtype;
  v_item public.shop_items%rowtype;
  v_inventory_id bigint;
  v_red integer; v_blue integer; v_gold integer; v_slots text[]; v_slot integer;
  v_price integer; v_remaining integer; v_balance integer;
  v_equipped jsonb;
begin
  if (p_item_id is null) = (p_potion_type is null)
    or (p_potion_type is not null and p_potion_type not in ('red','blue','gold')) then
    raise exception 'invalid sale item';
  end if;
  select * into v_character from public.game_characters c where c.id=p_character_id for update;
  if not found or (v_character.owner_user_id is not null and auth.uid() is distinct from v_character.owner_user_id)
    or (v_character.owner_user_id is null and auth.uid() is not null) then
    raise exception 'character not found';
  end if;
  if v_character.owner_user_id is not null then
    select p.crystal_balance into strict v_balance from public.profiles p
      where p.user_id=v_character.owner_user_id for update;
  else
    v_balance:=v_character.coins;
  end if;

  if p_item_id is not null then
    select * into v_item from public.shop_items i where i.id=p_item_id;
    if not found or v_item.category<>'avatar' then raise exception 'invalid sale item'; end if;
    select i.id into v_inventory_id from public.character_inventory i
      where i.character_id=p_character_id and i.item_id=p_item_id order by i.id limit 1 for update;
    if not found then raise exception 'item not owned'; end if;
    delete from public.character_inventory where id=v_inventory_id;
    select count(*)::integer into v_remaining from public.character_inventory i
      where i.character_id=p_character_id and i.item_id=p_item_id;
    if v_remaining=0 then
      select coalesce(jsonb_object_agg(e.key,e.value),'{}'::jsonb) into v_equipped
        from jsonb_each(coalesce(v_character.equipped_items,'{}'::jsonb)) e
        where e.value<>to_jsonb(p_item_id) and e.value<>to_jsonb(p_item_id::text);
      update public.game_characters c set equipped_items=v_equipped,
        equipped_item_id=case when c.equipped_item_id=p_item_id then null else c.equipped_item_id end
        where c.id=p_character_id;
    end if;
    v_price:=v_item.price/5;
  else
    select * into v_potions from public.story_potion_inventory i where i.character_id=p_character_id for update;
    if not found then raise exception 'item not owned'; end if;
    v_slots:=array[v_potions.equipped_slot_1,v_potions.equipped_slot_2];
    v_red:=v_potions.red_potion_count; v_blue:=v_potions.blue_potion_count; v_gold:=v_potions.gold_potion_count;
    if v_potions.potion_count_model='total' then
      v_red:=greatest(0,v_red-(case when v_slots[1]='red' then 1 else 0 end)-(case when v_slots[2]='red' then 1 else 0 end));
      v_blue:=greatest(0,v_blue-(case when v_slots[1]='blue' then 1 else 0 end)-(case when v_slots[2]='blue' then 1 else 0 end));
    end if;
    if (case p_potion_type when 'red' then v_red when 'blue' then v_blue else v_gold end)>0 then
      if p_potion_type='red' then v_red:=v_red-1; elsif p_potion_type='blue' then v_blue:=v_blue-1; else v_gold:=v_gold-1; end if;
    else
      v_slot:=array_position(v_slots,p_potion_type);
      if v_slot is null then raise exception 'item not owned'; end if;
      v_slots[v_slot]:=null;
    end if;
    update public.story_potion_inventory set red_potion_count=v_red,blue_potion_count=v_blue,gold_potion_count=v_gold,
      equipped_slot_1=v_slots[1],equipped_slot_2=v_slots[2],potion_count_model='remaining'
      where character_id=p_character_id;
    v_remaining:=(case p_potion_type when 'red' then v_red when 'blue' then v_blue else v_gold end)
      +(case when v_slots[1]=p_potion_type then 1 else 0 end)+(case when v_slots[2]=p_potion_type then 1 else 0 end);
    v_price:=case when p_potion_type='gold' then 38 else 4 end;
  end if;
  if v_character.owner_user_id is not null then
    update public.profiles p set crystal_balance=p.crystal_balance+v_price,updated_at=now()
      where p.user_id=v_character.owner_user_id returning p.crystal_balance into v_balance;
  else
    update public.game_characters c set coins=c.coins+v_price
      where c.id=p_character_id returning c.coins into v_balance;
  end if;
  if v_price>0 then
    insert into public.coin_ledger(character_id,amount,reason,item_id)
      values(p_character_id,v_price,case when p_item_id is null then 'potion_sale' else 'item_sale' end,p_item_id);
  end if;
  return query select v_price,v_balance,v_remaining;
end $function$;
revoke all on function public.sell_owned_item(uuid,bigint,text) from public;
grant execute on function public.sell_owned_item(uuid,bigint,text) to anon,authenticated;
