alter table public.shop_items
  drop constraint if exists shop_items_slot_check;

alter table public.shop_items
  add constraint shop_items_slot_check
    check (slot is null or slot in ('skin', 'head', 'body', 'weapon', 'back', 'aura', 'pet'));

insert into public.shop_items
  (code, name, category, price, icon, description, repeatable, active, slot, rarity, stars, stat_key, stat_value, art_path)
values
  ('ranger_violet_crystal_skin', '보랏빛 결정 궁수', 'avatar', 2000, '◆',
   '은보랏빛 트윈테일과 결정 장궁으로 모습을 바꾸는 여성 궁수 전용 스킨입니다.',
   false, true, 'skin', 'legendary', 5, null, 0,
   'assets/avatars/skins/ranger-female-violet-crystal.webp')
on conflict (code) do update
set name = excluded.name,
    category = excluded.category,
    price = excluded.price,
    icon = excluded.icon,
    description = excluded.description,
    repeatable = excluded.repeatable,
    active = excluded.active,
    slot = excluded.slot,
    rarity = excluded.rarity,
    stars = excluded.stars,
    stat_key = excluded.stat_key,
    stat_value = excluded.stat_value,
    art_path = excluded.art_path;

create or replace function public.purchase_shop_item(
  p_character_id uuid,
  p_item_id bigint
)
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
  if v_balance < v_item.price then raise exception 'not enough crystals'; end if;

  if v_item.category = 'avatar' then
    if exists(select 1 from public.character_inventory where character_id = p_character_id and item_id = p_item_id) then
      raise exception 'already owned';
    end if;
    insert into public.character_inventory(character_id, item_id) values(p_character_id, p_item_id);
  else
    insert into public.reward_redemptions(character_id, item_id, price_paid, status)
    values(p_character_id, p_item_id, v_item.price, 'pending') returning id into v_redemption;
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

create or replace function public.equip_avatar_slot(
  p_character_id uuid,
  p_item_id bigint,
  p_slot text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_character public.game_characters%rowtype;
  v_items jsonb;
  v_item public.shop_items%rowtype;
  v_request_user_id uuid := auth.uid();
begin
  if p_slot not in ('skin', 'head', 'body', 'weapon', 'back', 'aura', 'pet') then
    raise exception 'invalid equipment slot';
  end if;

  select * into v_character
  from public.game_characters where id = p_character_id for update;
  if v_character.id is null then raise exception 'character not found'; end if;
  if v_character.owner_user_id is not null then
    if v_request_user_id is distinct from v_character.owner_user_id then raise exception 'character not found'; end if;
  elsif v_request_user_id is not null then
    raise exception 'character not found';
  end if;
  v_items := coalesce(v_character.equipped_items, '{}'::jsonb);

  if p_item_id is null then
    v_items := v_items - p_slot;
  else
    select * into v_item
    from public.shop_items
    where id = p_item_id and category = 'avatar' and active = true;
    if v_item.id is null or v_item.slot is distinct from p_slot then
      raise exception 'item does not fit slot';
    end if;
    if v_item.code = 'ranger_violet_crystal_skin'
       and (v_character.class <> 'ranger' or v_character.avatar_variant <> 'female') then
      raise exception 'female ranger required';
    end if;
    if not exists (
      select 1 from public.character_inventory
      where character_id = p_character_id and item_id = p_item_id
    ) then
      raise exception 'item not owned';
    end if;
    v_items := jsonb_set(v_items, array[p_slot], to_jsonb(p_item_id), true);
  end if;

  update public.game_characters
  set equipped_items = v_items,
      equipped_item_id = p_item_id
  where id = p_character_id;
  return v_items;
end;
$function$;

revoke all on function public.purchase_shop_item(uuid, bigint) from public;
grant execute on function public.purchase_shop_item(uuid, bigint) to anon, authenticated;
revoke all on function public.equip_avatar_slot(uuid, bigint, text) from public;
grant execute on function public.equip_avatar_slot(uuid, bigint, text) to anon, authenticated;
