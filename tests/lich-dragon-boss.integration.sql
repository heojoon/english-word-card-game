-- Linked production verification only. All wallet and progress changes roll back.
begin;
do $test$
declare c record; r record; initial_balance integer; expected integer; elapsed integer; blocked boolean;
begin
  select gc.id,gc.owner_user_id into c from public.game_characters gc
    join public.profiles p on p.user_id=gc.owner_user_id where p.role='admin' order by gc.created_at limit 1;
  if not found then raise exception 'No admin character available'; end if;
  perform set_config('request.jwt.claim.sub',c.owner_user_id::text,true);
  perform set_config('request.jwt.claim.role','authenticated',true);
  if has_function_privilege('anon','public.claim_lich_dragon_boss_reward(uuid,integer,integer)','execute') then raise exception 'Anonymous reward access'; end if;
  if has_function_privilege('authenticated','public.claim_sorcerus_final_boss_reward(uuid,integer,integer)','execute') then raise exception 'Superseded RPC remains callable'; end if;
  blocked:=false;
  begin perform public.claim_lich_dragon_boss_reward(c.id,199,1000); exception when others then blocked:=true; end;
  if not blocked then raise exception 'Incomplete result accepted'; end if;
  blocked:=false;
  begin perform public.claim_lich_dragon_boss_reward(c.id,200,480001); exception when others then blocked:=true; end;
  if not blocked then raise exception 'Invalid duration accepted'; end if;
  perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
  blocked:=false;
  begin perform public.claim_lich_dragon_boss_reward(c.id,200,1000); exception when others then blocked:=true; end;
  if not blocked then raise exception 'Foreign character accepted'; end if;
  perform set_config('request.jwt.claim.sub',c.owner_user_id::text,true);
  foreach elapsed in array array[240000,240001,480000] loop
    delete from public.coin_ledger l using public.game_characters gc
      where l.character_id=gc.id and gc.owner_user_id=c.owner_user_id and l.reason in ('lich_dragon_boss_reward','sorcerus_final_boss_reward');
    select crystal_balance into initial_balance from public.profiles where user_id=c.owner_user_id;
    expected:=case when elapsed<=240000 then 1000 else 700 end;
    select * into r from public.claim_lich_dragon_boss_reward(c.id,200,elapsed);
    if r.reward<>expected or r.balance<>initial_balance+expected then raise exception 'Reward boundary mismatch'; end if;
    if not exists(select 1 from public.game_scores where id=r.game_score_id and stage='스토리 5장 20 · 보랏빛 수정동굴' and correct=200 and total=200 and cleared and treasure_claimed) then raise exception 'Progression missing'; end if;
    select * into r from public.claim_lich_dragon_boss_reward(c.id,200,1000);
    if r.reward<>0 or r.balance<>initial_balance+expected then raise exception 'Duplicate reward'; end if;
  end loop;
end;
$test$;
rollback;
