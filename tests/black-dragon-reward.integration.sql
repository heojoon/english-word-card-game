-- Rollback-only check on the linked production database; no permanent rewards.
begin;
do $test$
declare c uuid; other_c uuid; owner uuid; before_balance integer; first_claim record; second_claim record;
begin
 select g.id,g.owner_user_id into c,owner from public.game_characters g join public.profiles p on p.user_id=g.owner_user_id where g.owner_user_id is not null limit 1;
 if c is null then raise exception 'No owned character available'; end if;
 perform set_config('request.jwt.claim.sub',owner::text,true);
 select crystal_balance into before_balance from public.profiles where user_id=owner;
 -- Remove any existing boss claim only inside this rolled-back transaction.
 delete from public.coin_ledger l using public.game_characters g where l.character_id=g.id and g.owner_user_id=owner and l.reason='black_dragon_boss_reward';
 select * into first_claim from public.claim_black_dragon_boss_reward(c,60,300000);
 if first_claim.reward<>600 or first_claim.balance<>before_balance+600 then raise exception 'Incorrect first reward'; end if;
 select id into other_c from public.game_characters where owner_user_id=owner and id<>c limit 1;
 select * into second_claim from public.claim_black_dragon_boss_reward(coalesce(other_c,c),60,10000);
 if second_claim.reward<>0 or second_claim.balance<>first_claim.balance or second_claim.game_score_id<>first_claim.game_score_id then raise exception 'Duplicate account reward'; end if;
 begin
  perform public.claim_black_dragon_boss_reward(c,59,10000);raise exception 'Invalid result accepted';
 exception when others then if sqlerrm<>'invalid boss result' then raise; end if;end;
 begin
  perform public.claim_black_dragon_boss_reward(c,60,300001);raise exception 'Invalid time accepted';
 exception when others then if sqlerrm<>'invalid boss result' then raise; end if;end;
 perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000000',true);
 begin
  perform public.claim_black_dragon_boss_reward(c,60,300000);raise exception 'Wrong owner accepted';
 exception when others then if sqlerrm<>'character not found' then raise; end if;end;
end $test$;
rollback;
