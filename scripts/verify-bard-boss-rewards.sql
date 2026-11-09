-- Linked remote only. Fixtures, scores, rewards and wallet changes roll back.
begin;
do $test$
declare
  v_owner uuid := gen_random_uuid();
  v_bard public.game_characters;
  v_sniper uuid := gen_random_uuid();
  v_result record;
  v_first_reward integer;
begin
  insert into auth.users(id,raw_user_meta_data,created_at,updated_at)
    values(v_owner,'{"display_name":"bardrewardtest"}'::jsonb,now(),now());
  perform set_config('request.jwt.claim.sub',v_owner::text,true);
  v_bard := public.create_account_character('bardrewardtest','bard','male','violet');
  insert into public.game_scores(player,stage,correct,total,cleared,character_id,duration_ms,coins_earned)
    values(v_bard.player,'스토리 8장 29 · 잿빛 종이 울리는 마을',40,40,true,v_bard.id,60000,0);
  select * into v_result from public.claim_vargas_reward(v_bard.id,45,270000,0,0);
  assert v_result.coins_earned=64;
  v_first_reward:=v_result.coins_earned;
  assert exists(select 1 from public.game_scores where id=v_result.game_score_id and correct=45 and cleared);
  assert not exists(select 1 from public.character_active_skill_unlocks where character_id=v_bard.id);
  select * into v_result from public.claim_vargas_reward(v_bard.id,45,270000,0,0);
  assert v_result.coins_earned=0;
  insert into public.game_characters(id,owner_user_id,player,name,class,avatar_variant)
    values(v_sniper,v_owner,v_bard.player,'sniperrewardtest','sniper','female');
  select * into v_result from public.claim_vargas_reward(v_sniper,45,270000,0,0);
  assert v_result.coins_earned=0;
  assert exists(select 1 from public.character_active_skill_unlocks where character_id=v_sniper and class_code='sniper');
  assert (select crystal_balance=v_first_reward from public.profiles where user_id=v_owner);
  perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  begin
    perform public.claim_vargas_reward(v_bard.id,45,270000,0,0);
    raise exception 'foreign bard reward accepted';
  exception when others then
    if sqlerrm<>'character not found' then raise; end if;
  end;
end $test$;
rollback;
select 'bard Vargas reward, replay, legacy sniper unlock and owner protection passed' as status;
