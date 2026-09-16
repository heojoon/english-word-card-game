-- One shared crystal wallet per authenticated account.
alter table public.profiles
  add column crystal_balance integer not null default 0
  check (crystal_balance >= 0);

-- Preserve all value already earned by an account. Character balances are
-- summed once, and the previously informational email reward becomes spendable.
update public.profiles p
set crystal_balance = p.email_reward_crystals + coalesce((
  select sum(c.coins)::integer
  from public.game_characters c
  where c.owner_user_id = p.user_id
), 0);

update public.game_characters
set coins = 0
where owner_user_id is not null;

grant select (crystal_balance) on public.profiles to authenticated;

comment on column public.profiles.crystal_balance is
'Shared spendable crystal balance for every character owned by this account.';

create or replace function public.purchase_character_creation_ticket(
  p_payer_character_id uuid
)
returns table(ticket_id bigint, new_balance integer, available_tickets integer)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_balance integer;
  v_ticket_id bigint;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if not exists (
    select 1 from public.game_characters c
    where c.id = p_payer_character_id and c.owner_user_id = v_user_id
  ) then raise exception 'character not found'; end if;

  select p.crystal_balance into v_balance
  from public.profiles p
  where p.user_id = v_user_id
  for update;

  if v_balance is null then raise exception 'profile not found'; end if;
  if v_balance < 1000 then raise exception 'not enough crystals'; end if;

  update public.profiles
  set crystal_balance = crystal_balance - 1000, updated_at = now()
  where user_id = v_user_id
  returning crystal_balance into v_balance;

  insert into public.character_creation_tickets (
    owner_user_id, purchased_by_character_id, price_paid
  ) values (v_user_id, p_payer_character_id, 1000)
  returning id into v_ticket_id;

  insert into public.coin_ledger(character_id, amount, reason)
  values (p_payer_character_id, -1000, 'character_creation_ticket');

  return query
  select v_ticket_id, v_balance, count(*)::integer
  from public.character_creation_tickets t
  where t.owner_user_id = v_user_id and t.consumed_by_character_id is null;
end;
$function$;

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
  v_balance integer;
  v_redemption bigint;
  v_owner_user_id uuid;
  v_request_user_id uuid := auth.uid();
begin
  select * into v_item from public.shop_items where id = p_item_id and active = true;
  if v_item.id is null then raise exception 'item not found'; end if;

  select c.owner_user_id into v_owner_user_id
  from public.game_characters c where c.id = p_character_id for update;
  if not found then raise exception 'character not found'; end if;

  if v_owner_user_id is not null then
    if v_request_user_id is distinct from v_owner_user_id then raise exception 'character not found'; end if;
    select p.crystal_balance into v_balance
    from public.profiles p where p.user_id = v_owner_user_id for update;
  else
    if v_request_user_id is not null then raise exception 'character not found'; end if;
    select c.coins into v_balance
    from public.game_characters c where c.id = p_character_id for update;
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

  if v_owner_user_id is not null then
    update public.profiles
    set crystal_balance = crystal_balance - v_item.price, updated_at = now()
    where user_id = v_owner_user_id returning crystal_balance into v_balance;
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

create or replace function public.claim_stage_treasure(
  p_character_id uuid,
  p_game_score_id bigint
)
returns table(reward integer, balance integer)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_class text;
  v_owner_user_id uuid;
  v_request_user_id uuid := auth.uid();
  v_min integer;
  v_reward integer;
begin
  select c.class, c.owner_user_id into v_class, v_owner_user_id
  from public.game_characters c where c.id = p_character_id for update;
  if v_class is null then raise exception 'character not found'; end if;
  if v_owner_user_id is not null and v_request_user_id is distinct from v_owner_user_id then raise exception 'character not found'; end if;
  if v_owner_user_id is null and v_request_user_id is not null then raise exception 'character not found'; end if;

  update public.game_scores set treasure_claimed = true
  where id = p_game_score_id and character_id = p_character_id and cleared = true and treasure_claimed = false;
  if not found then raise exception 'treasure unavailable or already claimed'; end if;

  v_min := case when v_class = 'ranger' then 20 else 10 end;
  v_reward := v_min + floor(random() * (31 - v_min))::integer;
  if v_owner_user_id is not null then
    update public.profiles
    set crystal_balance = crystal_balance + v_reward, updated_at = now()
    where user_id = v_owner_user_id returning crystal_balance into balance;
  else
    update public.game_characters
    set coins = coins + v_reward
    where id = p_character_id returning coins into balance;
  end if;
  insert into public.coin_ledger(character_id, amount, reason, game_score_id)
  values(p_character_id, v_reward, 'treasure_reward', p_game_score_id);
  reward := v_reward;
  return next;
end;
$function$;

create or replace function public.award_game_result(
  p_character_id uuid,
  p_stage text,
  p_correct integer,
  p_total integer,
  p_cleared boolean,
  p_duration_ms integer
)
returns table(game_score_id bigint, coins_earned integer, balance integer, personal_best boolean, stage_record boolean)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_player text;
  v_class text;
  v_owner_user_id uuid;
  v_request_user_id uuid := auth.uid();
  v_score_id bigint;
  v_question_reward integer;
  v_combo_bonus integer;
  v_clear_bonus integer;
  v_reward integer;
  v_balance integer;
  v_personal boolean := false;
  v_record boolean := false;
  v_prev_personal integer;
  v_prev_global integer;
begin
  select c.player, c.class, c.owner_user_id
  into v_player, v_class, v_owner_user_id
  from public.game_characters c where c.id = p_character_id for update;
  if v_player is null then raise exception 'character not found'; end if;
  if v_owner_user_id is not null and v_request_user_id is distinct from v_owner_user_id then raise exception 'character not found'; end if;
  if v_owner_user_id is null and v_request_user_id is not null then raise exception 'character not found'; end if;
  if p_total <= 0 or p_correct < 0 or p_correct > p_total then raise exception 'invalid score'; end if;
  if p_cleared and p_correct <> p_total then raise exception 'cleared score must be perfect'; end if;
  if p_duration_ms is null or p_duration_ms < 0 then raise exception 'invalid duration'; end if;

  v_question_reward := p_correct;
  v_combo_bonus := floor(p_correct / case when v_class = 'pugilist' then 3.0 else 5.0 end)::integer;
  v_clear_bonus := case when p_cleared then 10 else 0 end;
  v_reward := v_question_reward + v_combo_bonus + v_clear_bonus;

  if p_cleared then
    select min(s.duration_ms) into v_prev_personal from public.game_scores s
    where s.character_id = p_character_id and s.stage = p_stage and s.cleared and s.duration_ms is not null;
    select min(s.duration_ms) into v_prev_global from public.game_scores s
    where s.stage = p_stage and s.cleared and s.duration_ms is not null;
    v_personal := v_prev_personal is null or p_duration_ms < v_prev_personal;
    v_record := v_prev_global is null or p_duration_ms < v_prev_global;
  end if;

  insert into public.game_scores(player, stage, correct, total, cleared, character_id, duration_ms, coins_earned)
  values(v_player, p_stage, p_correct, p_total, p_cleared, p_character_id, p_duration_ms, v_reward)
  returning id into v_score_id;

  if v_owner_user_id is not null then
    update public.profiles
    set crystal_balance = crystal_balance + v_reward, updated_at = now()
    where user_id = v_owner_user_id returning crystal_balance into v_balance;
  else
    update public.game_characters
    set coins = coins + v_reward
    where id = p_character_id returning coins into v_balance;
  end if;

  if v_question_reward > 0 then insert into public.coin_ledger(character_id, amount, reason, stage, game_score_id) values(p_character_id, v_question_reward, 'question_reward', p_stage, v_score_id); end if;
  if v_combo_bonus > 0 then insert into public.coin_ledger(character_id, amount, reason, stage, game_score_id) values(p_character_id, v_combo_bonus, 'combo_bonus', p_stage, v_score_id); end if;
  if v_clear_bonus > 0 then insert into public.coin_ledger(character_id, amount, reason, stage, game_score_id) values(p_character_id, v_clear_bonus, 'stage_clear_bonus', p_stage, v_score_id); end if;

  return query select v_score_id, v_reward, v_balance, v_personal, v_record;
end;
$function$;

revoke all on function public.purchase_character_creation_ticket(uuid) from public;
revoke all on function public.purchase_shop_item(uuid, bigint) from public;
revoke all on function public.claim_stage_treasure(uuid, bigint) from public;
revoke all on function public.award_game_result(uuid, text, integer, integer, boolean, integer) from public;
grant execute on function public.purchase_character_creation_ticket(uuid) to authenticated;
grant execute on function public.purchase_shop_item(uuid, bigint) to anon, authenticated;
grant execute on function public.claim_stage_treasure(uuid, bigint) to anon, authenticated;
grant execute on function public.award_game_result(uuid, text, integer, integer, boolean, integer) to anon, authenticated;
