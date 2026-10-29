-- Explicit linked-production regression. All fixtures, scores and wallet writes roll back.
begin;
do $test$
declare
  v_owner uuid:=gen_random_uuid(); v_a uuid:=gen_random_uuid(); v_b uuid:=gen_random_uuid();
  v_stage text:='스토리 8장 30 · 잿빛 종이 울리는 마을';
  v_before integer; v_balance integer; v_result record; v_count integer;
begin
  insert into auth.users(id,raw_user_meta_data,created_at,updated_at)
    values(v_owner,'{"display_name":"vargastest"}'::jsonb,now(),now());
  insert into public.game_characters(id,owner_user_id,player,name,class) values
    (v_a,v_owner,'vargastest','VargasA','warrior'),(v_b,v_owner,'vargastest','VargasB','mage');
  perform set_config('request.jwt.claim.sub',v_owner::text,true);
  select crystal_balance into strict v_before from public.profiles where user_id=v_owner;
  assert not has_function_privilege('anon','public.claim_vargas_reward(uuid,integer,integer,integer,integer)','EXECUTE');
  assert has_function_privilege('authenticated','public.claim_vargas_reward(uuid,integer,integer,integer,integer)','EXECUTE');
  begin
    perform public.claim_vargas_reward(v_a,45,60000,0,0);
    raise exception 'missing prerequisite was accepted';
  exception when others then
    if sqlerrm<>'previous stage clear required' then raise; end if;
  end;
  insert into public.game_scores(player,stage,character_id,correct,total,cleared,duration_ms)
    values('vargastest','스토리 8장 29 · 잿빛 종이 울리는 마을',v_a,40,40,true,60000);
  begin
    perform public.claim_vargas_reward(v_a,45,60000,1,0);
    raise exception 'living boss was accepted';
  exception when others then
    if sqlerrm<>'invalid vargas boss result' then raise; end if;
  end;
  select * into v_result from public.claim_vargas_reward(v_a,45,60000,0,0);
  assert v_result.coins_earned=64,'45 actual answers + 9 combo + 10 clear';
  assert (select correct=45 and total=45 and cleared from public.game_scores where id=v_result.game_score_id);
  assert (select sum(amount) from public.coin_ledger where game_score_id=v_result.game_score_id)=64;
  assert exists(select 1 from public.character_active_skill_unlocks where character_id=v_a);
  select * into v_result from public.claim_vargas_reward(v_b,30,60000,0,0);
  assert v_result.coins_earned=0,'another character unlocks without repeating account payout';
  assert exists(select 1 from public.character_active_skill_unlocks where character_id=v_b and class_code='mage');
  perform public.claim_vargas_reward(v_a,45,60000,0,0);
  select crystal_balance into v_balance from public.profiles where user_id=v_owner;
  assert v_balance=v_before+64,'retry must not pay twice';
  select count(*) into v_count from public.character_active_skill_unlocks where character_id in(v_a,v_b);
  assert v_count=2;
  begin
    perform public.claim_vargas_reward(v_a,45,120001,0,0);
    raise exception 'late clear was accepted';
  exception when others then
    if sqlerrm<>'invalid vargas boss result' then raise; end if;
  end;
  perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  begin
    perform public.claim_vargas_reward(v_a,45,60000,0,0);
    raise exception 'foreign character was accepted';
  exception when others then
    if sqlerrm<>'character not found' then raise; end if;
  end;
end $test$;
rollback;
select 'Vargas rewards: actual answer counts, HP 0, ownership, prerequisite, ledger, replay and character unlocks verified; all fixtures rolled back.' as result;
