create or replace function public.purchase_story_potion(p_character_id uuid,p_potion_type text)
returns table(new_balance integer,red_potion_count integer,blue_potion_count integer)
language plpgsql security definer set search_path = '' as $function$
declare
  v_character public.game_characters%rowtype;
  v_balance integer;
  v_red integer;
  v_blue integer;
begin
  if p_potion_type not in ('red','blue') then raise exception 'invalid potion type'; end if;
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
  if coalesce(v_balance,0)<20 then raise exception 'not enough crystals'; end if;

  if v_character.owner_user_id is not null then
    update public.profiles p set crystal_balance=p.crystal_balance-20,updated_at=now()
      where p.user_id=v_character.owner_user_id returning p.crystal_balance into v_balance;
  else
    update public.game_characters c set coins=c.coins-20
      where c.id=p_character_id returning c.coins into v_balance;
  end if;

  insert into public.story_potion_inventory(character_id,red_potion_count,blue_potion_count)
    values(p_character_id,case when p_potion_type='red' then 1 else 0 end,
      case when p_potion_type='blue' then 1 else 0 end)
    on conflict (character_id) do update set
      red_potion_count=public.story_potion_inventory.red_potion_count+
        case when p_potion_type='red' then 1 else 0 end,
      blue_potion_count=public.story_potion_inventory.blue_potion_count+
        case when p_potion_type='blue' then 1 else 0 end
    returning public.story_potion_inventory.red_potion_count,
      public.story_potion_inventory.blue_potion_count into v_red,v_blue;

  insert into public.coin_ledger(character_id,amount,reason)
    values(p_character_id,-20,'potion_purchase');
  return query select v_balance,v_red,v_blue;
end $function$;

revoke all on function public.purchase_story_potion(uuid,text) from public;
grant execute on function public.purchase_story_potion(uuid,text) to anon,authenticated;
