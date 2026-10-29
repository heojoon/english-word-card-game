-- HP 180 boss: record actual answers, independently of the former 40-question clear.
-- Existing award_game_result overloads remain compatible with deployed clients.
create or replace function public.claim_vargas_reward(
  p_character_id uuid, p_correct integer, p_duration_ms integer,
  p_boss_hp integer, p_slash_bonus integer default 0
)
returns table(game_score_id bigint, coins_earned integer, balance integer)
language plpgsql security definer set search_path = '' as $function$
declare
  v_owner uuid; v_player text; v_class text; v_score bigint;
  v_balance integer; v_reward integer; v_combo integer; v_replay boolean;
  v_stage constant text := '스토리 8장 30 · 잿빛 종이 울리는 마을';
begin
  select c.owner_user_id,c.player,c.class into v_owner,v_player,v_class
    from public.game_characters c where c.id=p_character_id for update;
  if not found or v_owner is null or auth.uid() is distinct from v_owner then
    raise exception 'character not found';
  end if;
  if p_boss_hp is distinct from 0 or p_correct is null or p_correct<1 or p_correct>180
    or p_duration_ms is null or p_duration_ms<1 or p_duration_ms>120000
    or p_slash_bonus is null or p_slash_bonus<0 then
    raise exception 'invalid vargas boss result';
  end if;
  if p_slash_bonus>0 and (v_class<>'warrior'
    or p_slash_bonus::numeric>5::numeric*p_correct*(p_correct+1)/2) then
    raise exception 'invalid slash bonus';
  end if;
  -- Serialize the account-wide first payout across different characters.
  select p.crystal_balance into v_balance from public.profiles p
    where p.user_id=v_owner for update;
  if not found then raise exception 'account wallet unavailable'; end if;
  if not exists(select 1 from public.profiles p where p.user_id=v_owner and p.role='admin')
    and not exists(select 1 from public.game_scores s
      join public.game_characters c on c.id=s.character_id
      where c.owner_user_id=v_owner and s.stage='스토리 8장 29 · 잿빛 종이 울리는 마을' and s.cleared) then
    raise exception 'previous stage clear required';
  end if;
  select exists(select 1 from public.game_scores s
    join public.game_characters c on c.id=s.character_id
    where c.owner_user_id=v_owner and s.stage=v_stage and s.cleared) into v_replay;
  v_combo:=floor(p_correct / case when v_class='pugilist' then 3.0 else 5.0 end)::integer;
  v_reward:=case when v_replay then 0 else p_correct+v_combo+10+p_slash_bonus end;
  insert into public.game_scores(player,stage,correct,total,cleared,character_id,duration_ms,coins_earned)
    values(v_player,v_stage,p_correct,p_correct,true,p_character_id,p_duration_ms,v_reward)
    returning id into v_score;
  insert into public.character_active_skill_unlocks(character_id,class_code,source_game_score_id)
    values(p_character_id,v_class,v_score) on conflict(character_id) do nothing;
  if not v_replay then
    update public.profiles set crystal_balance=crystal_balance+v_reward,updated_at=now()
      where user_id=v_owner returning crystal_balance into v_balance;
    insert into public.coin_ledger(character_id,amount,reason,stage,game_score_id)
      values(p_character_id,p_correct,'question_reward',v_stage,v_score);
    if v_combo>0 then insert into public.coin_ledger(character_id,amount,reason,stage,game_score_id)
      values(p_character_id,v_combo,'combo_bonus',v_stage,v_score); end if;
    insert into public.coin_ledger(character_id,amount,reason,stage,game_score_id)
      values(p_character_id,10,'stage_clear_bonus',v_stage,v_score);
    if p_slash_bonus>0 then insert into public.coin_ledger(character_id,amount,reason,stage,game_score_id)
      values(p_character_id,p_slash_bonus,'warrior_consecutive_slash',v_stage,v_score); end if;
  end if;
  return query select v_score,v_reward,v_balance;
end $function$;
revoke all on function public.claim_vargas_reward(uuid,integer,integer,integer,integer) from public,anon;
grant execute on function public.claim_vargas_reward(uuid,integer,integer,integer,integer) to authenticated;
comment on function public.claim_vargas_reward(uuid,integer,integer,integer,integer) is
  'Vargas HP 180 defeat: actual answer count, account first payout and per-character active unlock atomically.';
