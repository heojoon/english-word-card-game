create or replace function public.record_game_result_without_reward(
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
  v_owner_user_id uuid;
  v_request_user_id uuid := auth.uid();
  v_score_id bigint;
  v_personal boolean := false;
  v_record boolean := false;
  v_prev_personal integer;
  v_prev_global integer;
begin
  select c.player, c.owner_user_id into v_player, v_owner_user_id
  from public.game_characters c where c.id = p_character_id for update;
  if v_player is null then raise exception 'character not found'; end if;
  if v_owner_user_id is not null and v_request_user_id is distinct from v_owner_user_id then raise exception 'character not found'; end if;
  if v_owner_user_id is null and v_request_user_id is not null then raise exception 'character not found'; end if;
  if p_total <= 0 or p_correct < 0 or p_correct > p_total then raise exception 'invalid score'; end if;
  if p_cleared and p_correct <> p_total then raise exception 'cleared score must be perfect'; end if;
  if p_duration_ms is null or p_duration_ms < 0 then raise exception 'invalid duration'; end if;

  if p_cleared then
    select min(s.duration_ms) into v_prev_personal from public.game_scores s
    where s.character_id = p_character_id and s.stage = p_stage and s.cleared and s.duration_ms is not null;
    select min(s.duration_ms) into v_prev_global from public.game_scores s
    where s.stage = p_stage and s.cleared and s.duration_ms is not null;
    v_personal := v_prev_personal is null or p_duration_ms < v_prev_personal;
    v_record := v_prev_global is null or p_duration_ms < v_prev_global;
  end if;

  insert into public.game_scores(player, stage, correct, total, cleared, character_id, duration_ms, coins_earned)
  values(v_player, p_stage, p_correct, p_total, p_cleared, p_character_id, p_duration_ms, 0)
  returning id into v_score_id;

  if v_owner_user_id is not null then
    select p.crystal_balance into balance from public.profiles p where p.user_id = v_owner_user_id;
  else
    select c.coins into balance from public.game_characters c where c.id = p_character_id;
  end if;
  return query select v_score_id, 0, balance, v_personal, v_record;
end;
$function$;

create or replace function public.claim_stage_treasure_without_reward(
  p_character_id uuid,
  p_game_score_id bigint
)
returns table(reward integer, balance integer)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_owner_user_id uuid;
  v_request_user_id uuid := auth.uid();
begin
  select c.owner_user_id into v_owner_user_id
  from public.game_characters c where c.id = p_character_id for update;
  if not found then raise exception 'character not found'; end if;
  if v_owner_user_id is not null and v_request_user_id is distinct from v_owner_user_id then raise exception 'character not found'; end if;
  if v_owner_user_id is null and v_request_user_id is not null then raise exception 'character not found'; end if;

  update public.game_scores set treasure_claimed = true
  where id = p_game_score_id and character_id = p_character_id and cleared = true and treasure_claimed = false;
  if not found then raise exception 'treasure unavailable or already claimed'; end if;

  reward := 0;
  if v_owner_user_id is not null then
    select p.crystal_balance into balance from public.profiles p where p.user_id = v_owner_user_id;
  else
    select c.coins into balance from public.game_characters c where c.id = p_character_id;
  end if;
  return next;
end;
$function$;

revoke all on function public.record_game_result_without_reward(uuid, text, integer, integer, boolean, integer) from public;
revoke all on function public.claim_stage_treasure_without_reward(uuid, bigint) from public;
grant execute on function public.record_game_result_without_reward(uuid, text, integer, integer, boolean, integer) to anon, authenticated;
grant execute on function public.claim_stage_treasure_without_reward(uuid, bigint) to anon, authenticated;
