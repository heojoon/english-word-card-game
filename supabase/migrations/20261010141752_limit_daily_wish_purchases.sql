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
    if exists(select 1 from public.character_inventory where character_id = p_character_id and item_id = p_item_id) then
      raise exception 'already owned';
    end if;
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
