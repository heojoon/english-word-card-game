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
  v_red integer; v_blue integer; v_slots text[]; v_slot integer;
  v_price integer; v_remaining integer; v_balance integer;
  v_equipped jsonb;
begin
  if (p_item_id is null) = (p_potion_type is null)
    or (p_potion_type is not null and p_potion_type not in ('red','blue')) then
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
    v_red:=v_potions.red_potion_count; v_blue:=v_potions.blue_potion_count;
    if v_potions.potion_count_model='total' then
      v_red:=greatest(0,v_red-(case when v_slots[1]='red' then 1 else 0 end)-(case when v_slots[2]='red' then 1 else 0 end));
      v_blue:=greatest(0,v_blue-(case when v_slots[1]='blue' then 1 else 0 end)-(case when v_slots[2]='blue' then 1 else 0 end));
    end if;
    if (case when p_potion_type='red' then v_red else v_blue end)>0 then
      if p_potion_type='red' then v_red:=v_red-1; else v_blue:=v_blue-1; end if;
    else
      v_slot:=array_position(v_slots,p_potion_type);
      if v_slot is null then raise exception 'item not owned'; end if;
      v_slots[v_slot]:=null;
    end if;
    update public.story_potion_inventory set red_potion_count=v_red,blue_potion_count=v_blue,
      equipped_slot_1=v_slots[1],equipped_slot_2=v_slots[2],potion_count_model='remaining'
      where character_id=p_character_id;
    v_remaining:=(case when p_potion_type='red' then v_red else v_blue end)
      +(case when v_slots[1]=p_potion_type then 1 else 0 end)+(case when v_slots[2]=p_potion_type then 1 else 0 end);
    v_price:=20/5;
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
