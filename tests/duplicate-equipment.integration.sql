-- Isolated production fixtures; every change is rolled back.
begin;
do $test$
declare
  v_owner uuid:=gen_random_uuid(); v_other uuid:=gen_random_uuid();
  v_character uuid; v_item bigint; v_price integer; v_score bigint;
  v_before integer; v_reward record; v_rejected boolean;
begin
  insert into auth.users(id) values(v_owner),(v_other);
  insert into public.profiles(user_id,display_name,crystal_balance)
    values(v_owner,'duplicate-test',10000)
    on conflict(user_id) do update set crystal_balance=10000;
  insert into public.game_characters(player,name,class,owner_user_id)
    values('copy-test','copy-test','warrior',v_owner) returning id into v_character;
  perform set_config('request.jwt.claim.sub',v_owner::text,true);
  select id,price into strict v_item,v_price from public.shop_items where code='gale_boots' and active;
  perform public.purchase_shop_item(v_character,v_item);
  perform public.purchase_shop_item(v_character,v_item);
  if (select count(*) from public.character_inventory where character_id=v_character and item_id=v_item)<>2 then
    raise exception 'two purchases did not grant two copies';
  end if;
  if (select crystal_balance from public.profiles where user_id=v_owner)<>10000-2*v_price then
    raise exception 'duplicate purchase wallet debit mismatch';
  end if;
  if (select count(*) from public.coin_ledger where character_id=v_character and item_id=v_item)<>2 then
    raise exception 'duplicate purchase ledger mismatch';
  end if;
  perform public.equip_avatar_slot(v_character,v_item,'feet');
  if (select equipped_items->>'feet' from public.game_characters where id=v_character)<>v_item::text then
    raise exception 'duplicate item equip failed';
  end if;
  perform public.equip_avatar_slot(v_character,null,'feet');
  if (select count(*) from public.character_inventory where character_id=v_character and item_id=v_item)<>2 then
    raise exception 'equip/unequip consumed copies';
  end if;
  -- Own every eligible normal reward first: the chest must still grant equipment.
  insert into public.character_inventory(character_id,item_id)
    select v_character,id from public.shop_items where active and category='avatar' and slot<>'skin' and rarity='normal';
  select count(*) into v_before from public.character_inventory where character_id=v_character;
  insert into public.game_scores(player,stage,correct,total,cleared,character_id,duration_ms,treasure_claimed)
    values('copy-test','스토리 1 · copy-test',1,1,true,v_character,1000,true) returning id into v_score;
  select * into v_reward from public.claim_story_item_treasure(v_character,v_score);
  if v_reward.item_id is null then raise exception 'all-owned chest failed to grant equipment'; end if;
  if (select count(*) from public.character_inventory where character_id=v_character)<>v_before+1 then
    raise exception 'chest did not add a copy';
  end if;
  if (select count(*) from public.character_inventory where character_id=v_character and item_id=v_reward.item_id)<2 then
    raise exception 'chest did not grant already-owned item';
  end if;
  v_rejected:=false;
  begin
    perform public.claim_story_item_treasure(v_character,v_score);
  exception when raise_exception then
    if sqlerrm<>'story item already claimed' then raise; end if;
    v_rejected:=true;
  end;
  if not v_rejected then raise exception 'same chest paid twice'; end if;
  perform set_config('request.jwt.claim.sub',v_other::text,true);
  v_rejected:=false;
  begin
    perform public.purchase_shop_item(v_character,v_item);
  exception when raise_exception then
    if sqlerrm<>'character not found' then raise; end if;
    v_rejected:=true;
  end;
  if not v_rejected then raise exception 'owner check bypassed'; end if;
  perform set_config('request.jwt.claim.sub',v_owner::text,true);
  update public.profiles set crystal_balance=0 where user_id=v_owner;
  v_rejected:=false;
  begin
    perform public.purchase_shop_item(v_character,v_item);
  exception when raise_exception then
    if sqlerrm<>'not enough crystals' then raise; end if;
    v_rejected:=true;
  end;
  if not v_rejected then raise exception 'unfunded duplicate purchase allowed'; end if;
end;
$test$;
select 'duplicate purchases, wallet/ledger, equip, owned-item chest, claim protection, ownership and insufficient funds passed' as result;
rollback;
