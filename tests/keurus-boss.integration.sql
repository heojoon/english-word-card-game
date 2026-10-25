-- Linked production verification; all wallet and progression changes roll back.
begin;
do $test$
declare c record; r record; initial_balance integer; blocked boolean;
begin
  select gc.id,gc.owner_user_id,gc.player into c from public.game_characters gc
    join public.profiles p on p.user_id=gc.owner_user_id where p.role='admin' limit 1;
  if not found then raise exception 'No admin test character'; end if;
  perform set_config('request.jwt.claim.sub',c.owner_user_id::text,true);
  perform set_config('request.jwt.claim.role','authenticated',true);
  if has_function_privilege('anon','public.claim_keurus_reward(uuid,integer,integer,integer)','execute') then
    raise exception 'Anonymous reward access';
  end if;
  insert into public.game_scores(player,stage,correct,total,cleared,character_id,duration_ms,coins_earned,treasure_claimed)
    values(c.player,'스토리 7A장 14 · 심연의 불타는 고대 탑',30,30,true,c.id,1000,0,true);
  delete from public.coin_ledger l using public.game_characters gc
    where l.character_id=gc.id and gc.owner_user_id=c.owner_user_id and l.reason='keurus_reward';
  select crystal_balance into initial_balance from public.profiles where user_id=c.owner_user_id;
  blocked:=false;
  begin perform public.claim_keurus_reward(c.id,30,1000,1); exception when others then blocked:=true; end;
  if not blocked then raise exception 'Living boss accepted'; end if;
  blocked:=false;
  begin perform public.claim_keurus_reward(c.id,30,300001,0); exception when others then blocked:=true; end;
  if not blocked then raise exception 'Timeout accepted'; end if;
  perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
  blocked:=false;
  begin perform public.claim_keurus_reward(c.id,30,1000,0); exception when others then blocked:=true; end;
  if not blocked then raise exception 'Foreign owner accepted'; end if;
  perform set_config('request.jwt.claim.sub',c.owner_user_id::text,true);
  select * into r from public.claim_keurus_reward(c.id,67,100000,0);
  if r.reward<>400 or r.balance<>initial_balance+400 then raise exception 'First reward mismatch'; end if;
  if not exists(select 1 from public.game_scores where id=r.game_score_id
    and stage='스토리 7A장 15 · 심연의 불타는 고대 탑' and cleared and treasure_claimed and coins_earned=400) then
    raise exception 'Progress or chest guard missing';
  end if;
  select * into r from public.claim_keurus_reward(c.id,200,300000,0);
  if r.reward<>0 or r.balance<>initial_balance+400 then raise exception 'Duplicate reward'; end if;
end $test$;
rollback;
