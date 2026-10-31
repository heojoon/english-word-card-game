-- Execute on the linked remote DB. All score/wallet/ledger writes roll back.
begin;
do $test$
declare
  v_owner uuid; v_first uuid; v_second uuid;
  v_before integer; v_after integer; v_receipt record; v_rejected boolean;
begin
  select p.user_id into v_owner from public.profiles p
  where p.role='admin' and (select count(*) from public.game_characters c where c.owner_user_id=p.user_id)>=2
    and not exists(select 1 from public.coin_ledger l join public.game_characters c on c.id=l.character_id
      where c.owner_user_id=p.user_id and l.reason='seal_knight_reward') limit 1;
  if v_owner is null then raise exception 'verification needs an admin account with two characters and no paid seal-knight receipt'; end if;
  select c.id into v_first from public.game_characters c where c.owner_user_id=v_owner order by c.id limit 1;
  select c.id into v_second from public.game_characters c where c.owner_user_id=v_owner and c.id<>v_first order by c.id limit 1;
  perform set_config('request.jwt.claim.sub',v_owner::text,true);
  select p.crystal_balance into v_before from public.profiles p where p.user_id=v_owner;
  -- Older ordinary clear does not consume the dedicated first reward.
  insert into public.game_scores(player,stage,correct,total,cleared,character_id,duration_ms,coins_earned,treasure_claimed)
    select c.player,'스토리 7C장 30 · 왕국 지하 던전',30,30,true,c.id,60000,0,true
    from public.game_characters c where c.id=v_first;
  select * into v_receipt from public.claim_seal_knight_reward(v_first,12,120000,0);
  if v_receipt.reward<>700 then raise exception 'first reward mismatch'; end if;
  if not exists(select 1 from public.game_scores s where s.id=v_receipt.game_score_id and s.correct=12 and s.total=12 and s.cleared) then raise exception 'variable answer record mismatch'; end if;
  select * into v_receipt from public.claim_seal_knight_reward(v_first,60,120000,0);
  if v_receipt.reward<>0 then raise exception 'duplicate reward'; end if;
  select * into v_receipt from public.claim_seal_knight_reward(v_second,80,200000,0);
  if v_receipt.reward<>0 then raise exception 'cross-character reward duplication'; end if;
  select * into v_receipt from public.claim_seal_knight_reward(v_second,0,200000,0);
  if v_receipt.reward<>0 or not exists(select 1 from public.game_scores s where s.id=v_receipt.game_score_id and s.correct=0 and s.total=1 and s.cleared) then raise exception 'zero-answer HP victory rejected'; end if;
  select p.crystal_balance into v_after from public.profiles p where p.user_id=v_owner;
  if v_after-v_before<>700 then raise exception 'wallet not atomic'; end if;
  if (select count(*) from public.coin_ledger l join public.game_characters c on c.id=l.character_id where c.owner_user_id=v_owner and l.reason='seal_knight_reward')<>1 then raise exception 'ledger receipt mismatch'; end if;
  v_rejected:=false;
  begin perform public.claim_seal_knight_reward(v_first,12,120000,1);
  exception when others then if sqlerrm='invalid boss result' then v_rejected:=true; else raise; end if; end;
  if not v_rejected then raise exception 'living boss accepted'; end if;
  v_rejected:=false;
  begin perform public.claim_seal_knight_reward(v_first,12,300001,0);
  exception when others then if sqlerrm='invalid boss result' then v_rejected:=true; else raise; end if; end;
  if not v_rejected then raise exception 'expired battle accepted'; end if;
  perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
  v_rejected:=false;
  begin perform public.claim_seal_knight_reward(v_first,12,120000,0);
  exception when others then if sqlerrm='character not found' then v_rejected:=true; else raise; end if; end;
  if not v_rejected then raise exception 'foreign character accepted'; end if;
end $test$;
rollback;
select true as seal_knight_reward_regressions_passed;
