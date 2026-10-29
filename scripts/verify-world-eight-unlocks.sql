-- Run against the linked remote database only. Every fixture and wallet change rolls back.
begin;
do $test$
declare
  v_owner uuid := gen_random_uuid();
  v_ids uuid[] := array[gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid()];
  v_classes text[] := array['warrior','mage','pugilist','ranger','sniper','warrior','mage'];
  v_stage text := '스토리 8장 30 · 잿빛 종이 울리는 마을';
  v_result record;
  v_count integer;
  i integer;
begin
  insert into auth.users(id,raw_user_meta_data,created_at,updated_at)
    values(v_owner,'{"display_name":"skilltest"}'::jsonb,now(),now());
  for i in 1..7 loop
    insert into public.game_characters(id,owner_user_id,player,name,class,avatar_variant)
      values(v_ids[i],v_owner,'skilltest','skilltest',v_classes[i],case when v_classes[i]='sniper' then 'female' else 'male' end);
  end loop;
  perform set_config('request.jwt.claim.sub',v_owner::text,true);
  for i in 1..6 loop
    select * into v_result from public.award_game_result(v_ids[i],v_stage,40,40,true,60000,0,0);
    if (i=1 and v_result.coins_earned<=0) or (i>1 and v_result.coins_earned<>0) then
      raise exception 'first-clear reward must be account-wide';
    end if;
    if not exists(select 1 from public.character_active_skill_unlocks u where u.character_id=v_ids[i] and u.class_code=v_classes[i]) then
      raise exception 'clearing character must receive its class skill';
    end if;
    if i=1 and exists(select 1 from public.character_active_skill_unlocks u where u.character_id=any(v_ids[2:7])) then
      raise exception 'skill must not be shared with other characters or classes';
    end if;
  end loop;
  perform public.award_game_result(v_ids[1],v_stage,40,40,true,55000,0,0);
  select count(*) into v_count from public.character_active_skill_unlocks where character_id=any(v_ids);
  if v_count<>6 then raise exception 'same-character retries must be idempotent'; end if;
  perform public.award_game_result(v_ids[7],v_stage,39,40,false,60000,0,0);
  perform public.award_game_result(v_ids[7],'스토리 8장 15 · 잿빛 종이 울리는 마을',40,40,true,60000,0,0);
  -- Direct score inserts are not an unlock API.
  insert into public.game_scores(player,stage,correct,total,cleared,character_id,duration_ms,coins_earned)
    values('skilltest',v_stage,40,40,true,v_ids[7],60000,0);
  if exists(select 1 from public.character_active_skill_unlocks where character_id=v_ids[7]) then
    raise exception 'failures, midbosses and direct score inserts must not grant skills';
  end if;
  perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  begin
    perform public.award_game_result(v_ids[7],v_stage,40,40,true,60000,0,0);
    raise exception 'foreign character clear was accepted';
  exception when others then
    if sqlerrm<>'character not found' then raise; end if;
  end;
  perform set_config('request.jwt.claim.sub',v_owner::text,true);
  begin
    perform public.award_game_result(v_ids[7],v_stage,39,39,true,60000,0,0);
    raise exception 'invalid final clear was accepted';
  exception when others then
    if sqlerrm<>'invalid world eight final clear' then raise; end if;
  end;
  if has_table_privilege('authenticated','public.character_active_skill_unlocks','INSERT')
    or has_table_privilege('authenticated','public.character_active_skill_unlocks','UPDATE')
    or has_table_privilege('authenticated','public.character_active_skill_unlocks','DELETE')
    or has_table_privilege('anon','public.character_active_skill_unlocks','SELECT') then
    raise exception 'unlock table must expose owner reads only';
  end if;
  perform set_config('test.world8_skill_owner',v_owner::text,true);
end $test$;
set local role authenticated;
do $test$
declare v_count integer;
begin
  select count(*) into v_count from public.character_active_skill_unlocks;
  if v_count<>6 then raise exception 'owner must read own six unlocked characters'; end if;
  perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  select count(*) into v_count from public.character_active_skill_unlocks;
  if v_count<>0 then raise exception 'foreign account must not read unlocks'; end if;
end $test$;
reset role;
rollback;
select 'world eight unlock transaction, rewards, ownership and RLS passed' as status;
