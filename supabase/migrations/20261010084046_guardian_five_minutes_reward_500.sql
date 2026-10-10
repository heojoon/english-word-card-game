-- Extend World 2 boss battles to five minutes and future first-clear rewards to 500.
create or replace function public.claim_guardian_boss_reward(
  p_character_id uuid, p_correct integer, p_duration_ms integer
)
returns table(game_score_id bigint, reward integer, balance integer)
language plpgsql security definer set search_path = '' as $function$
declare
  v_owner uuid; v_player text; v_score bigint; v_balance integer;
  v_stage constant text := '스토리 2장 7 · 크리스탈 사원 입구';
begin
  select c.owner_user_id,c.player into v_owner,v_player
    from public.game_characters c where c.id=p_character_id for update;
  if not found or v_owner is null or auth.uid() is distinct from v_owner then
    raise exception 'character not found';
  end if;
  if p_correct is distinct from 60 or p_duration_ms is null
    or p_duration_ms<=0 or p_duration_ms>300000 then
    raise exception 'invalid boss result';
  end if;
  -- Serialize all characters sharing the account wallet, including retries.
  select p.crystal_balance into v_balance from public.profiles p
    where p.user_id=v_owner for update;
  if not found then raise exception 'account wallet unavailable'; end if;
  select l.game_score_id into v_score from public.coin_ledger l
    join public.game_characters c on c.id=l.character_id
    where c.owner_user_id=v_owner and l.reason='guardian_boss_reward'
    order by l.id limit 1;
  if found then
    return query select v_score,0,v_balance;
    return;
  end if;
  -- This score also unlocks progression, with no standard or chest rewards.
  insert into public.game_scores(player,stage,correct,total,cleared,character_id,duration_ms,coins_earned,treasure_claimed)
    values(v_player,v_stage,60,60,true,p_character_id,p_duration_ms,500,true)
    returning id into v_score;
  update public.profiles set crystal_balance=crystal_balance+500,updated_at=now()
    where user_id=v_owner returning crystal_balance into v_balance;
  insert into public.coin_ledger(character_id,amount,reason,stage,game_score_id)
    values(p_character_id,500,'guardian_boss_reward',v_stage,v_score);
  return query select v_score,500,v_balance;
end $function$;
revoke all on function public.claim_guardian_boss_reward(uuid,integer,integer) from public,anon;
grant execute on function public.claim_guardian_boss_reward(uuid,integer,integer) to authenticated;
