-- Preserve zero actual answers when Fire Arrow alone completes the encounter.
do $migration$
declare definition text;
begin
  select pg_get_functiondef('public.claim_world_nine_boss_result(uuid,integer,integer,integer,integer,integer)'::regprocedure) into definition;
  definition:=replace(definition,'v_stage text;','v_stage text;v_base record;v_replay boolean;v_reward integer;v_balance integer;v_personal boolean;v_record boolean;');
  if position('v_replay boolean' in definition)=0 then raise exception 'unexpected training boss definition'; end if;
  definition:=replace(definition,
    'return query select * from public.award_game_result(p_character_id,v_stage,p_correct,greatest(1,p_correct),true,p_duration_ms,p_slash_bonus);',
    'if p_correct=0 then
      if p_slash_bonus<>0 then raise exception ''zero answers cannot earn slash bonus''; end if;
      perform 1 from public.profiles p where p.user_id=v_owner for update;
      select exists(select 1 from public.game_scores s join public.game_characters c on c.id=s.character_id
        where c.owner_user_id=v_owner and s.stage=v_stage and s.cleared) into v_replay;
      select coalesce(p_duration_ms<min(s.duration_ms),true) into v_personal from public.game_scores s where s.character_id=p_character_id and s.stage=v_stage and s.cleared;
      select coalesce(p_duration_ms<min(s.duration_ms),true) into v_record from public.game_scores s where s.stage=v_stage and s.cleared;
      select * into v_base from public.award_game_result(p_character_id,v_stage,0,1,false,p_duration_ms,0);
      v_reward:=case when v_replay then 0 else 10 end;
      update public.game_scores set cleared=true,coins_earned=v_reward where id=v_base.game_score_id;
      update public.profiles set crystal_balance=crystal_balance+v_reward where user_id=v_owner returning crystal_balance into v_balance;
      if v_reward>0 then insert into public.coin_ledger(character_id,amount,reason,stage,game_score_id)
        values(p_character_id,v_reward,''stage_clear_bonus'',v_stage,v_base.game_score_id); end if;
      return query select v_base.game_score_id,v_reward,v_balance,v_personal,v_record;
    else
      return query select * from public.award_game_result(p_character_id,v_stage,p_correct,p_correct,true,p_duration_ms,p_slash_bonus);
    end if;');
  if position('zero answers cannot earn slash bonus' in definition)=0 then raise exception 'zero answer handling replacement failed'; end if;
  execute definition;
end $migration$;
