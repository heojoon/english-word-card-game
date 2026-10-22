-- Linked production transaction; all wallet, profile, receipt and score writes roll back.
begin;
do $test$
declare c record; r record; initial_balance integer; receipt bigint; blocked boolean; other_id uuid;
begin
  select gc.id,gc.owner_user_id into c from public.game_characters gc
    join public.profiles p on p.user_id=gc.owner_user_id where p.role='admin' order by gc.created_at limit 1;
  if not found then raise exception 'No admin character available'; end if;
  perform set_config('request.jwt.claim.sub',c.owner_user_id::text,true);
  if has_function_privilege('anon','public.claim_elliot_reward(uuid,integer,integer,boolean,integer,integer)','execute')
    or not has_function_privilege('authenticated','public.claim_elliot_reward(uuid,integer,integer,boolean,integer,integer)','execute') then
    raise exception 'Reward execution privilege mismatch';
  end if;
  delete from public.coin_ledger l using public.game_characters gc
    where l.character_id=gc.id and gc.owner_user_id=c.owner_user_id and l.reason='elliot_final_boss_reward';
  select crystal_balance into initial_balance from public.profiles where user_id=c.owner_user_id;
  blocked:=false;begin perform public.claim_elliot_reward(c.id,67,239999,true,250,1);exception when others then blocked:=true;end;
  if not blocked then raise exception 'Early victory accepted'; end if;
  blocked:=false;begin perform public.claim_elliot_reward(c.id,67,240000,true,251,1);exception when others then blocked:=true;end;
  if not blocked then raise exception 'Insufficient damage accepted'; end if;
  blocked:=false;begin perform public.claim_elliot_reward(c.id,67,240000,true,250,0);exception when others then blocked:=true;end;
  if not blocked then raise exception 'Dead player accepted'; end if;
  select * into r from public.claim_elliot_reward(c.id,5,50000,false,490,0);
  if r.reward<>0 or r.balance<>initial_balance then raise exception 'Failure paid crystals'; end if;
  select * into r from public.claim_elliot_reward(c.id,67,240000,true,250,1);receipt:=r.game_score_id;
  if r.reward<>800 or r.balance<>initial_balance+800 then raise exception 'First reward mismatch'; end if;
  if not exists(select 1 from public.game_scores where id=receipt and stage='스토리 6장 20 · 왕국수도로 가는 길'
    and cleared and treasure_claimed and duration_ms=240000 and coins_earned=800) then raise exception 'Score contract mismatch'; end if;
  select * into r from public.claim_elliot_reward(c.id,80,240000,true,0,1);
  if r.reward<>0 or r.game_score_id<>receipt then raise exception 'Repeated reward'; end if;
  select id into other_id from public.game_characters where owner_user_id=c.owner_user_id and id<>c.id limit 1;
  if found then
    select * into r from public.claim_elliot_reward(other_id,80,240000,true,250,1);
    if r.reward<>0 or r.game_score_id<>receipt then raise exception 'Cross-character reward'; end if;
  end if;
  blocked:=false;begin perform public.award_game_result(c.id,'스토리 6장 20 · 왕국수도로 가는 길',67,67,true,1000);exception when others then blocked:=true;end;
  if not blocked then raise exception 'Generic reward bypass'; end if;
  perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
  blocked:=false;begin perform public.claim_elliot_reward(c.id,67,240000,true,250,1);exception when others then blocked:=true;end;
  if not blocked then raise exception 'Foreign character accepted'; end if;
  perform set_config('request.jwt.claim.sub','',true);
  blocked:=false;begin perform public.claim_elliot_reward(c.id,67,240000,true,250,1);exception when others then blocked:=true;end;
  if not blocked then raise exception 'Anonymous caller accepted'; end if;
  perform set_config('request.jwt.claim.sub',c.owner_user_id::text,true);
  update public.profiles set role='student' where user_id=c.owner_user_id;
  delete from public.story_branch_choices where user_id=c.owner_user_id;
  insert into public.story_branch_choices(user_id,branch) values(c.owner_user_id,'6A');
  blocked:=false;begin perform public.claim_elliot_reward(c.id,67,240000,true,250,1);exception when others then blocked:=true;end;
  if not blocked then raise exception 'Wrong branch accepted'; end if;
  update public.story_branch_choices set branch='6B' where user_id=c.owner_user_id;
  delete from public.game_scores s using public.game_characters gc where s.character_id=gc.id
    and gc.owner_user_id=c.owner_user_id and s.stage='스토리 6장 19 · 왕국수도로 가는 길';
  blocked:=false;begin perform public.claim_elliot_reward(c.id,67,240000,true,250,1);exception when others then blocked:=true;end;
  if not blocked then raise exception 'Missing prior stage accepted'; end if;
  insert into public.game_scores(player,stage,correct,total,cleared,character_id,duration_ms,coins_earned)
    select player,'스토리 6장 19 · 왕국수도로 가는 길',1,1,true,id,1000,0 from public.game_characters where id=c.id;
  select * into r from public.claim_elliot_reward(c.id,67,240000,true,250,1);
  if r.reward<>0 or r.game_score_id<>receipt then raise exception 'Valid branch replay failed'; end if;
  if (select crystal_balance from public.profiles where user_id=c.owner_user_id)<>initial_balance+800 then raise exception 'Wallet mismatch'; end if;
end;
$test$;
rollback;
