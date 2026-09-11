-- Production support for the Crystal Quest playable flow.
alter table public.game_characters
  add column if not exists equipped_items jsonb not null default '{}'::jsonb;

alter table public.game_scores
  add column if not exists treasure_claimed boolean not null default false;

-- Preserve a legacy single equipped item in the new slot model.
update public.game_characters gc
set equipped_items = jsonb_set(
  gc.equipped_items,
  array[case si.code when 'crown' then 'head' when 'cape' then 'back' when 'wings' then 'back' when 'aura' then 'aura' else 'aura' end],
  to_jsonb(gc.equipped_item_id),
  true
)
from public.shop_items si
where gc.equipped_item_id = si.id
  and not (gc.equipped_items ? case si.code when 'crown' then 'head' when 'cape' then 'back' when 'wings' then 'back' when 'aura' then 'aura' else 'aura' end);

create or replace function public.equip_avatar_slot(
  p_character_id uuid,
  p_item_id bigint,
  p_slot text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_items jsonb;
  v_expected_slot text;
begin
  if p_slot not in ('head', 'back', 'aura', 'pet') then raise exception 'invalid equipment slot'; end if;
  select equipped_items into v_items from public.game_characters where id = p_character_id for update;
  if v_items is null then raise exception 'character not found'; end if;

  if p_item_id is null then
    v_items := v_items - p_slot;
  else
    select case code when 'crown' then 'head' when 'cape' then 'back' when 'wings' then 'back' when 'aura' then 'aura' when 'pet' then 'pet' else null end
    into v_expected_slot from public.shop_items where id = p_item_id and category = 'avatar' and active = true;
    if v_expected_slot is null or v_expected_slot <> p_slot then raise exception 'item does not fit slot'; end if;
    if not exists(select 1 from public.character_inventory where character_id = p_character_id and item_id = p_item_id) then raise exception 'item not owned'; end if;
    v_items := jsonb_set(v_items, array[p_slot], to_jsonb(p_item_id), true);
  end if;

  update public.game_characters set equipped_items = v_items, equipped_item_id = p_item_id where id = p_character_id;
  return v_items;
end;
$function$;

grant execute on function public.equip_avatar_slot(uuid, bigint, text) to anon, authenticated;

create or replace function public.claim_stage_treasure(
  p_character_id uuid,
  p_game_score_id bigint
)
returns table(reward integer, balance integer)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_class text;
  v_min integer;
  v_reward integer;
begin
  select gc.class into v_class from public.game_characters gc where gc.id = p_character_id for update;
  if v_class is null then raise exception 'character not found'; end if;

  update public.game_scores set treasure_claimed = true
  where id = p_game_score_id and character_id = p_character_id and cleared = true and treasure_claimed = false;
  if not found then raise exception 'treasure unavailable or already claimed'; end if;

  v_min := case when v_class = 'ranger' then 20 else 10 end;
  v_reward := v_min + floor(random() * (31 - v_min))::integer;
  update public.game_characters set coins = coins + v_reward where id = p_character_id returning coins into balance;
  insert into public.coin_ledger(character_id, amount, reason, game_score_id)
  values(p_character_id, v_reward, 'treasure_reward', p_game_score_id);
  reward := v_reward;
  return next;
end;
$function$;

grant execute on function public.claim_stage_treasure(uuid, bigint) to anon, authenticated;

-- The fighter's class trait awards a combo crystal every three answers.
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
set search_path to 'public'
as $function$
declare
  v_player text;
  v_class text;
  v_score_id bigint;
  v_question_reward integer;
  v_combo_bonus integer;
  v_clear_bonus integer;
  v_reward integer;
  v_personal boolean := false;
  v_record boolean := false;
  v_prev_personal integer;
  v_prev_global integer;
begin
  select gc.player, gc.class into v_player, v_class from public.game_characters gc where gc.id = p_character_id for update;
  if v_player is null then raise exception 'character not found'; end if;
  if p_total <= 0 or p_correct < 0 or p_correct > p_total then raise exception 'invalid score'; end if;
  if p_cleared and p_correct <> p_total then raise exception 'cleared score must be perfect'; end if;
  if p_duration_ms is null or p_duration_ms < 0 then raise exception 'invalid duration'; end if;

  v_question_reward := p_correct;
  v_combo_bonus := floor(p_correct / case when v_class = 'pugilist' then 3.0 else 5.0 end)::integer;
  v_clear_bonus := case when p_cleared then 10 else 0 end;
  v_reward := v_question_reward + v_combo_bonus + v_clear_bonus;

  if p_cleared then
    select min(duration_ms) into v_prev_personal from public.game_scores where character_id = p_character_id and stage = p_stage and cleared and duration_ms is not null;
    select min(duration_ms) into v_prev_global from public.game_scores where stage = p_stage and cleared and duration_ms is not null;
    v_personal := v_prev_personal is null or p_duration_ms < v_prev_personal;
    v_record := v_prev_global is null or p_duration_ms < v_prev_global;
  end if;

  insert into public.game_scores(player, stage, correct, total, cleared, character_id, duration_ms, coins_earned)
  values(v_player, p_stage, p_correct, p_total, p_cleared, p_character_id, p_duration_ms, v_reward)
  returning id into v_score_id;
  if v_reward > 0 then update public.game_characters set coins = coins + v_reward where id = p_character_id; end if;
  if v_question_reward > 0 then insert into public.coin_ledger(character_id, amount, reason, stage, game_score_id) values(p_character_id, v_question_reward, 'question_reward', p_stage, v_score_id); end if;
  if v_combo_bonus > 0 then insert into public.coin_ledger(character_id, amount, reason, stage, game_score_id) values(p_character_id, v_combo_bonus, 'combo_bonus', p_stage, v_score_id); end if;
  if v_clear_bonus > 0 then insert into public.coin_ledger(character_id, amount, reason, stage, game_score_id) values(p_character_id, v_clear_bonus, 'stage_clear_bonus', p_stage, v_score_id); end if;

  return query select v_score_id, v_reward, gc.coins, v_personal, v_record from public.game_characters gc where gc.id = p_character_id;
end;
$function$;
