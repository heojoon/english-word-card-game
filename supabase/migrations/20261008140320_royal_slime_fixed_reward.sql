-- Fixed, one-time final-boss reward shared by all characters on an account.
create or replace function public.claim_royal_slime_reward(
  p_character_id uuid, p_stage_score_id bigint, p_correct integer, p_duration_ms integer
)
returns table(game_score_id bigint, reward integer, balance integer)
language plpgsql security definer set search_path = '' as $function$
declare
  v_owner uuid; v_player text; v_score bigint; v_balance integer;
  v_stage constant text := '보스 · 거대 로얄 슬라임';
begin
  select c.owner_user_id,c.player into v_owner,v_player
  from public.game_characters c where c.id=p_character_id for update;
  if not found or v_owner is null or auth.uid() is distinct from v_owner then
    raise exception 'character not found';
  end if;
  if p_correct is distinct from 50 or p_duration_ms is null
    or p_duration_ms<=0 or p_duration_ms>270000 then
    raise exception 'invalid boss result';
  end if;
  -- Match the character's actual stage-seven clear, independently of learning level.
  if not exists(select 1 from public.game_scores s where s.id=p_stage_score_id
    and s.character_id=p_character_id and s.stage='스토리 7 · 속삭이는 숲'
    and s.cleared and s.correct=s.total) then
    raise exception 'stage seven clear required';
  end if;
  -- Serialize claims from all characters sharing the same wallet.
  select p.crystal_balance into v_balance from public.profiles p
    where p.user_id=v_owner for update;
  if not found then raise exception 'account wallet unavailable'; end if;
  select s.id into v_score from public.game_scores s
    join public.game_characters c on c.id=s.character_id
    where c.owner_user_id=v_owner and s.stage=v_stage and s.cleared
    order by s.id limit 1;
  if found then
    return query select v_score,0,v_balance;
    return;
  end if;
  -- No standard question/combo/chest reward is added to the fixed 200.
  insert into public.game_scores(player,stage,correct,total,cleared,character_id,duration_ms,coins_earned,treasure_claimed)
    values(v_player,v_stage,50,50,true,p_character_id,p_duration_ms,200,true)
    returning id into v_score;
  update public.profiles set crystal_balance=crystal_balance+200,updated_at=now()
    where user_id=v_owner returning crystal_balance into v_balance;
  insert into public.coin_ledger(character_id,amount,reason,stage,game_score_id)
    values(p_character_id,200,'royal_slime_boss_reward',v_stage,v_score);
  return query select v_score,200,v_balance;
end $function$;
revoke all on function public.claim_royal_slime_reward(uuid,bigint,integer,integer) from public,anon;
grant execute on function public.claim_royal_slime_reward(uuid,bigint,integer,integer) to authenticated;
