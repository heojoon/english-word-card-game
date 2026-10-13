-- Each inventory row represents one copy. Preserve existing ownership/RLS,
-- wallet locking, slot-based equipment and per-score reward claim protection.
alter table public.character_inventory
  drop constraint character_inventory_character_id_item_id_key;
create index character_inventory_character_item_idx
  on public.character_inventory(character_id,item_id);
update public.shop_items set repeatable=true where category='avatar';

create or replace function public.purchase_shop_item(p_character_id uuid, p_item_id bigint)
returns table(purchase_type text, new_balance integer, redemption_id bigint)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_item public.shop_items%rowtype;
  v_character public.game_characters%rowtype;
  v_balance integer;
  v_redemption bigint;
  v_request_user_id uuid := auth.uid();
  v_day_start timestamptz;
  v_purchases bigint;
begin
  select * into v_item from public.shop_items where id = p_item_id and active = true;
  if v_item.id is null then raise exception 'item not found'; end if;

  select * into v_character
  from public.game_characters where id = p_character_id for update;
  if v_character.id is null then raise exception 'character not found'; end if;

  if v_character.owner_user_id is not null then
    if v_request_user_id is distinct from v_character.owner_user_id then raise exception 'character not found'; end if;
    select p.crystal_balance into v_balance
    from public.profiles p where p.user_id = v_character.owner_user_id for update;
  else
    if v_request_user_id is not null then raise exception 'character not found'; end if;
    v_balance := v_character.coins;
  end if;

  if v_item.code = 'ranger_violet_crystal_skin'
     and (v_character.class <> 'ranger' or v_character.avatar_variant <> 'female') then
    raise exception 'female ranger required';
  end if;
  if v_item.code = 'pugilist_crystal_rose_skin'
     and (v_character.class <> 'pugilist' or v_character.avatar_variant <> 'female') then
    raise exception 'female pugilist required';
  end if;
  if v_item.code = 'pugilist_crystal_noir_skin'
     and (v_character.class <> 'pugilist' or v_character.avatar_variant <> 'male') then
    raise exception 'male pugilist required';
  end if;
  -- The profile row is already locked: purchases across all account characters
  -- serialize before counting, so concurrent requests cannot exceed six.
  if v_item.code = 'wish' then
    v_day_start := date_trunc('day', clock_timestamp() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';
    select count(*) into v_purchases
    from public.reward_redemptions r
    join public.game_characters c on c.id = r.character_id
    where r.item_id = v_item.id
      and r.created_at >= v_day_start
      and r.created_at < v_day_start + interval '1 day'
      and (case when v_character.owner_user_id is not null
        then c.owner_user_id = v_character.owner_user_id
        else c.id = p_character_id end);
    -- Cancelled requests still count as purchases; a cancellation is not a reset.
    if v_purchases >= 6 then raise exception 'wish daily purchase limit'; end if;
  end if;
  if v_balance < v_item.price then raise exception 'not enough crystals'; end if;

  if v_item.category = 'avatar' then
    insert into public.character_inventory(character_id, item_id) values(p_character_id, p_item_id);
  else
    insert into public.reward_redemptions(character_id, item_id, price_paid, status, created_at)
    values(p_character_id, p_item_id, v_item.price, 'pending', clock_timestamp()) returning id into v_redemption;
  end if;

  if v_character.owner_user_id is not null then
    update public.profiles
    set crystal_balance = crystal_balance - v_item.price, updated_at = now()
    where user_id = v_character.owner_user_id returning crystal_balance into v_balance;
  else
    update public.game_characters
    set coins = coins - v_item.price
    where id = p_character_id returning coins into v_balance;
  end if;

  insert into public.coin_ledger(character_id, amount, reason, item_id)
  values(p_character_id, -v_item.price,
    case when v_item.category = 'avatar' then 'avatar_purchase' else 'gift_redemption' end,
    p_item_id);
  return query select v_item.category, v_balance, v_redemption;
end;
$function$;

revoke all on function public.purchase_shop_item(uuid, bigint) from public;
grant execute on function public.purchase_shop_item(uuid, bigint) to anon, authenticated;

create or replace function public.claim_story_item_treasure(p_character_id uuid,p_game_score_id bigint)
returns table(item_id bigint,item_name text,potion_count integer)
language plpgsql security definer set search_path = '' as $function$
declare v_owner uuid; v_stage text; v_item_id bigint; v_item_name text; v_potions integer;
begin
  select c.owner_user_id into v_owner from public.game_characters c where c.id=p_character_id for update;
  if not found or (v_owner is not null and auth.uid() is distinct from v_owner)
    or (v_owner is null and auth.uid() is not null) then raise exception 'character not found'; end if;
  if v_owner is not null then perform 1 from public.profiles p where p.user_id=v_owner for update; end if;
  select s.stage into v_stage from public.game_scores s where s.id=p_game_score_id
    and s.character_id=p_character_id and s.cleared and s.treasure_claimed for update;
  if not found or v_stage not like U&'\C2A4\D1A0\B9AC %' then raise exception 'story treasure unavailable'; end if;
  if exists(select 1 from public.story_item_rewards r where r.game_score_id=p_game_score_id)
    then raise exception 'story item already claimed'; end if;
  if exists(
    select 1 from public.game_scores s join public.game_characters c on c.id=s.character_id
    where s.stage=v_stage and s.cleared and s.id<>p_game_score_id
      and ((v_owner is not null and c.owner_user_id=v_owner)
        or (v_owner is null and c.id=p_character_id))
  ) then
    insert into public.story_item_rewards(game_score_id,character_id,item_id,potion_count)
      values(p_game_score_id,p_character_id,null,0);
    item_id:=null; item_name:=null; potion_count:=0; return next; return;
  end if;
  v_potions:=case when v_stage like U&'\C2A4\D1A0\B9AC 4 %' or v_stage like U&'\C2A4\D1A0\B9AC 5 %' then 3
    when v_stage like U&'\C2A4\D1A0\B9AC 3 %' then 2 else 1 end;
  select i.id,i.name into v_item_id,v_item_name from public.shop_items i
    where i.active and i.category='avatar' and i.slot<>'skin'
      and i.rarity=case when v_potions>=3 then 'unique' else 'normal' end
    order by random() limit 1;
  if v_item_id is not null then
    insert into public.character_inventory(character_id,item_id) values(p_character_id,v_item_id);
  else
    v_item_name:=U&'\BE68\AC04 \BB3C\C57D';
  end if;
  insert into public.story_item_rewards(game_score_id,character_id,item_id,potion_count)
    values(p_game_score_id,p_character_id,v_item_id,v_potions);
  insert into public.story_potion_inventory(character_id,red_potion_count)
    values(p_character_id,v_potions)
    on conflict (character_id) do update
      set red_potion_count=public.story_potion_inventory.red_potion_count+excluded.red_potion_count;
  item_id:=v_item_id; item_name:=v_item_name; potion_count:=v_potions; return next;
end $function$;

revoke all on function public.claim_story_item_treasure(uuid,bigint) from public;
grant execute on function public.claim_story_item_treasure(uuid,bigint) to anon,authenticated;
