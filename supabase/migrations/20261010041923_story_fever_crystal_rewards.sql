-- Keep the six/seven-argument contracts for older web and Android clients.
-- The existing award function enforces ownership and locks the wallet before
-- paying base/slash rewards; fever is recorded in the same transaction.
create or replace function public.award_game_result(
  p_character_id uuid, p_stage text, p_correct integer, p_total integer,
  p_cleared boolean, p_duration_ms integer, p_slash_bonus integer,
  p_fever_bonus integer
)
returns table(game_score_id bigint, coins_earned integer, balance integer, personal_best boolean, stage_record boolean)
language plpgsql security definer set search_path = '' as $function$
declare
  v_base record;
  v_owner uuid;
  v_balance integer;
begin
  if p_fever_bonus is null or p_fever_bonus < 0 then
    raise exception 'invalid fever bonus';
  end if;
  -- Fever starts only after every Story question is answered. Crystals spawn
  -- at most once per 550ms within the total * 3000ms game-time budget.
  if p_fever_bonus > 0 then
    if p_stage is null or p_stage not like '스토리 %'
      or p_total is null or p_total <= 0 or p_correct is distinct from p_total then
      raise exception 'fever bonus requires completed story questions';
    end if;
    if p_fever_bonus::numeric > ceil(p_total::numeric * 3000 / 550) then
      raise exception 'fever bonus exceeds spawn limit';
    end if;
  end if;

  select * into v_base from public.award_game_result(
    p_character_id, p_stage, p_correct, p_total, p_cleared, p_duration_ms, p_slash_bonus
  );
  -- A previously cleared Story stage pays neither base nor fever rewards.
  if p_fever_bonus = 0 or v_base.coins_earned = 0 then
    return query select v_base.game_score_id, v_base.coins_earned, v_base.balance, v_base.personal_best, v_base.stage_record;
    return;
  end if;

  select c.owner_user_id into v_owner from public.game_characters c
    where c.id = p_character_id for update;
  if v_owner is not null then
    update public.profiles set crystal_balance = crystal_balance + p_fever_bonus, updated_at = now()
      where user_id = v_owner returning crystal_balance into v_balance;
  else
    update public.game_characters set coins = coins + p_fever_bonus
      where id = p_character_id returning coins into v_balance;
  end if;
  update public.game_scores set coins_earned = coins_earned + p_fever_bonus
    where id = v_base.game_score_id and character_id = p_character_id;
  insert into public.coin_ledger(character_id, amount, reason, stage, game_score_id)
    values(p_character_id, p_fever_bonus, 'fever_bonus', p_stage, v_base.game_score_id);

  return query select v_base.game_score_id, v_base.coins_earned + p_fever_bonus, v_balance, v_base.personal_best, v_base.stage_record;
end;
$function$;

revoke all on function public.award_game_result(uuid,text,integer,integer,boolean,integer,integer,integer) from public;
grant execute on function public.award_game_result(uuid,text,integer,integer,boolean,integer,integer,integer) to anon, authenticated;
