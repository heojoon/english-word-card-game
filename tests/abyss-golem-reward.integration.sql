-- Linked production verification: all score, profile and wallet mutations roll back.
begin;
do $test$
declare c record; r record; initial_balance integer; receipt bigint; blocked boolean; other_id uuid;
begin
  select gc.id,gc.owner_user_id into c from public.game_characters gc
    join public.profiles p on p.user_id=gc.owner_user_id where p.role='admin' order by gc.created_at limit 1;
  if not found then raise exception 'No admin character available'; end if;
  perform set_config('request.jwt.claim.sub',c.owner_user_id::text,true);
  perform set_config('request.jwt.claim.role','authenticated',true);
  if has_function_privilege('anon','public.claim_abyss_golem_reward(uuid,integer,integer,boolean)','execute')
    or not has_function_privilege('authenticated','public.claim_abyss_golem_reward(uuid,integer,integer,boolean)','execute') then
    raise exception 'Reward execution privilege mismatch';
  end if;
  delete from public.coin_ledger l using public.game_characters gc
    where l.character_id=gc.id and gc.owner_user_id=c.owner_user_id and l.reason='abyss_golem_midboss_reward';
  select crystal_balance into initial_balance from public.profiles where user_id=c.owner_user_id;
  blocked:=false;begin perform public.claim_abyss_golem_reward(c.id,0,1000,true);exception when others then blocked:=true;end;
  if not blocked then raise exception 'Zero-answer victory accepted';end if;
  blocked:=false;begin perform public.claim_abyss_golem_reward(c.id,6001,1000,true);exception when others then blocked:=true;end;
  if not blocked then raise exception 'Invalid answer total accepted';end if;
  blocked:=false;begin perform public.claim_abyss_golem_reward(c.id,67,300001,true);exception when others then blocked:=true;end;
  if not blocked then raise exception 'Invalid duration accepted';end if;
  select * into r from public.claim_abyss_golem_reward(c.id,0,1000,false);
  if r.reward<>0 or r.balance<>initial_balance then raise exception 'Failure paid crystals';end if;
  if not exists(select 1 from public.game_scores where id=r.game_score_id and not cleared and coins_earned=0) then
    raise exception 'Failure score missing';end if;
  select * into r from public.claim_abyss_golem_reward(c.id,67,120000,true);receipt:=r.game_score_id;
  if r.reward<>300 or r.balance<>initial_balance+300 then raise exception 'First reward mismatch';end if;
  if not exists(select 1 from public.game_scores where id=receipt and stage='스토리 6A장 10 · 반전세계'
    and cleared and treasure_claimed and correct=67 and total=67 and coins_earned=300) then
    raise exception 'Progression or chest guard missing';end if;
  update public.game_scores set cleared=false where id=receipt;
  select * into r from public.claim_abyss_golem_reward(c.id,123,300000,true);
  if r.reward<>0 or r.balance<>initial_balance+300 or r.game_score_id<>receipt then raise exception 'Duplicate reward';end if;
  if not exists(select 1 from public.game_scores where id=receipt and cleared) then raise exception 'Progress not restored';end if;
  select id into other_id from public.game_characters where owner_user_id=c.owner_user_id and id<>c.id limit 1;
  if found then
    select * into r from public.claim_abyss_golem_reward(other_id,80,10000,true);
    if r.reward<>0 or r.game_score_id<>receipt then raise exception 'Cross-character duplicate reward';end if;
  end if;
  blocked:=false;begin perform public.award_game_result(c.id,'스토리 6A장 10 · 반전세계',67,67,true,1000);exception when others then blocked:=true;end;
  if not blocked then raise exception 'Generic victory reward bypass';end if;
  blocked:=false;begin select * into r from public.award_game_result(c.id,'스토리 6A장 10 · 반전세계',1,200,false,1000);exception when others then blocked:=true;end;
  -- A previously cleared stage may save a generic zero-reward failure safely.
  if not blocked and r.coins_earned<>0 then raise exception 'Generic failure farming bypass';end if;
  if (select crystal_balance from public.profiles where user_id=c.owner_user_id)<>initial_balance+300 then
    raise exception 'Unexpected wallet change';end if;
  perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
  blocked:=false;begin perform public.claim_abyss_golem_reward(c.id,67,1000,true);exception when others then blocked:=true;end;
  if not blocked then raise exception 'Foreign character accepted';end if;
  perform set_config('request.jwt.claim.sub','',true);
  blocked:=false;begin perform public.claim_abyss_golem_reward(c.id,67,1000,true);exception when others then blocked:=true;end;
  if not blocked then raise exception 'Anonymous caller accepted';end if;
  perform set_config('request.jwt.claim.sub',c.owner_user_id::text,true);
  update public.profiles set role='student' where user_id=c.owner_user_id;
  delete from public.story_branch_choices where user_id=c.owner_user_id;
  insert into public.story_branch_choices(user_id,branch) values(c.owner_user_id,'6B');
  blocked:=false;begin perform public.claim_abyss_golem_reward(c.id,67,1000,true);exception when others then blocked:=true;end;
  if not blocked then raise exception 'Wrong branch accepted';end if;
  update public.story_branch_choices set branch='6A' where user_id=c.owner_user_id;
  delete from public.game_scores s using public.game_characters gc
    where s.character_id=gc.id and gc.owner_user_id=c.owner_user_id and s.stage='스토리 6A장 9 · 반전세계';
  blocked:=false;begin perform public.claim_abyss_golem_reward(c.id,67,1000,true);exception when others then blocked:=true;end;
  if not blocked then raise exception 'Missing prior stage accepted';end if;
  insert into public.game_scores(player,stage,correct,total,cleared,character_id,duration_ms,coins_earned)
    select player,'스토리 6A장 9 · 반전세계',1,1,true,id,1000,0 from public.game_characters where id=c.id;
  select * into r from public.claim_abyss_golem_reward(c.id,67,1000,true);
  if r.reward<>0 or r.game_score_id<>receipt then raise exception 'Valid branch replay failed';end if;
  if (select count(*) from public.coin_ledger l join public.game_characters gc on gc.id=l.character_id
    where gc.owner_user_id=c.owner_user_id and l.reason='abyss_golem_midboss_reward')<>1 then raise exception 'Receipt count mismatch';end if;
end;
$test$;
rollback;
