-- Remote production verification. All wallet/score/ledger changes roll back.
begin;
do $test$
declare c record; r record; before_balance integer; after_balance integer; blocked boolean;
begin
  select gc.id,gc.owner_user_id into c from public.game_characters gc
    join public.profiles p on p.user_id=gc.owner_user_id where p.role='admin' order by gc.created_at limit 1;
  if not found then raise exception 'No admin character available for rollback verification'; end if;
  perform set_config('request.jwt.claim.sub',c.owner_user_id::text,true);
  perform set_config('request.jwt.claim.role','authenticated',true);
  select crystal_balance into before_balance from public.profiles where user_id=c.owner_user_id;
  -- Remove a previous claim only within this rollback transaction to test first claim.
  delete from public.coin_ledger l using public.game_characters gc
    where l.character_id=gc.id and gc.owner_user_id=c.owner_user_id and l.reason='red_reaper_boss_reward';
  blocked:=false;
  begin perform public.claim_red_reaper_boss_reward(c.id,119,1000); exception when others then blocked:=true; end;
  if not blocked then raise exception 'Invalid correct count accepted'; end if;
  blocked:=false;
  begin perform public.claim_red_reaper_boss_reward(c.id,120,340001); exception when others then blocked:=true; end;
  if not blocked then raise exception 'Invalid duration accepted'; end if;
  perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
  blocked:=false;
  begin perform public.claim_red_reaper_boss_reward(c.id,120,1000); exception when others then blocked:=true; end;
  if not blocked then raise exception 'Foreign character accepted'; end if;
  perform set_config('request.jwt.claim.sub',c.owner_user_id::text,true);
  update public.profiles set role='student' where user_id=c.owner_user_id;
  select * into r from public.claim_red_reaper_boss_reward(c.id,120,1000);
  if r.reward<>500 or r.balance<>before_balance+500 then raise exception 'First reward incorrect'; end if;
  if not exists(select 1 from public.game_scores where id=r.game_score_id and stage='스토리 4장 20 · 환각의 숲과 버려진 성' and correct=120 and total=120 and cleared and treasure_claimed) then raise exception 'Progression not saved'; end if;
  update public.profiles set role='teacher' where user_id=c.owner_user_id;
  select * into r from public.claim_red_reaper_boss_reward(c.id,120,1000);
  if r.reward<>0 or r.balance<>before_balance+500 then raise exception 'Duplicate claim rewarded'; end if;
  select crystal_balance into after_balance from public.profiles where user_id=c.owner_user_id;
  if after_balance<>before_balance+500 then raise exception 'Wallet mismatch'; end if;
end;
$test$;
rollback;
