-- Real-account balances and all fixture notices are untouched after rollback.
begin;
do $test$
declare
  a uuid:=gen_random_uuid(); u uuid:=gen_random_uuid(); n uuid:=gen_random_uuid(); mixed uuid:=gen_random_uuid(); closed uuid:=gen_random_uuid();
  hero uuid; item bigint; initial_balance integer; rejected boolean;
begin
  insert into auth.users(id) values(a),(u);
  insert into public.profiles(user_id,display_name,role) values(a,'crystal-gift-admin','admin'),(u,'crystal-gift-user','student')
    on conflict(user_id) do update set role=excluded.role;
  select crystal_balance into strict initial_balance from public.profiles where user_id=u;
  perform set_config('request.jwt.claim.sub',a::text,true);
  perform public.send_game_notice(n,'crystals','event','gift','selected',array[u],'[{"currency":"crystals","quantity":300}]');
  -- The recipient owns no character. Currency is still claimable.
  perform set_config('request.jwt.claim.sub',u::text,true);
  perform public.claim_game_notice(n,null); perform public.claim_game_notice(n,null);
  if (select crystal_balance from public.profiles where user_id=u)<>initial_balance+300 then raise exception 'crystal payout/retry mismatch'; end if;
  if not exists(select 1 from public.game_notice_receipts where notice_id=n and claimed_at is not null and dismissed_at is not null and character_id is null) then raise exception 'account-only receipt missing'; end if;
  perform set_config('request.jwt.claim.sub',a::text,true);
  rejected:=false;
  begin perform public.send_game_notice(gen_random_uuid(),'bad','notice','bad','selected',array[u],'[{"currency":"coins","quantity":1}]');
    exception when raise_exception then if sqlerrm<>'invalid reward currency' then raise; end if; rejected:=true; end;
  if not rejected then raise exception 'unsupported currency allowed'; end if;
  rejected:=false;
  begin perform public.send_game_notice(gen_random_uuid(),'bad','notice','bad','selected',array[u],'[{"currency":"crystals","quantity":1},{"currency":"crystals","quantity":2}]');
    exception when raise_exception then if sqlerrm<>'duplicate reward' then raise; end if; rejected:=true; end;
  if not rejected then raise exception 'duplicate currency allowed'; end if;
  rejected:=false;
  begin perform public.send_game_notice(gen_random_uuid(),'bad','notice','bad','selected',array[u],'[{"currency":"crystals","quantity":1000}]');
    exception when raise_exception then if sqlerrm<>'invalid quantity' then raise; end if; rejected:=true; end;
  if not rejected then raise exception 'over-limit currency allowed'; end if;
  select id into strict item from public.shop_items where active and code='gale_boots';
  perform public.send_game_notice(mixed,'mixed','event','gift','selected',array[u],jsonb_build_array(jsonb_build_object('currency','crystals','quantity',100),jsonb_build_object('item_id',item,'quantity',2)));
  perform set_config('request.jwt.claim.sub',u::text,true);
  rejected:=false;
  begin perform public.claim_game_notice(mixed,null);
    exception when raise_exception then if sqlerrm<>'character not found' then raise; end if; rejected:=true; end;
  if not rejected or (select crystal_balance from public.profiles where user_id=u)<>initial_balance+300 then raise exception 'mixed claim partially paid without character'; end if;
  insert into public.game_characters(player,name,class,owner_user_id) values('gift-test','gift hero','warrior',u) returning id into hero;
  perform public.claim_game_notice(mixed,hero);perform public.claim_game_notice(mixed,hero);
  if (select crystal_balance from public.profiles where user_id=u)<>initial_balance+400 then raise exception 'mixed currency mismatch'; end if;
  if (select count(*) from public.character_inventory where character_id=hero and item_id=item)<>2 then raise exception 'mixed item mismatch'; end if;
  perform set_config('request.jwt.claim.sub',a::text,true);
  perform public.send_game_notice(closed,'closed','notice','gift','selected',array[u],'[{"currency":"crystals","quantity":50}]');
  perform set_config('request.jwt.claim.sub',u::text,true);
  rejected:=false;
  begin perform public.dismiss_game_notice(closed);
    exception when raise_exception then if sqlerrm<>'claim notice rewards first' then raise; end if; rejected:=true; end;
  if not rejected or (select crystal_balance from public.profiles where user_id=u)<>initial_balance+400 then raise exception 'unclaimed crystal gift dismissed'; end if;
  if not exists(select 1 from public.pending_game_notices() where id=closed) then raise exception 'unclaimed gift lost'; end if;
  perform public.claim_game_notice(closed,null);perform public.dismiss_game_notice(closed);
  if (select crystal_balance from public.profiles where user_id=u)<>initial_balance+450 then raise exception 'gift unavailable after blocked dismissal'; end if;
end $test$;
select 'crystal gifts: account wallet, no-character claim, mixed gifts, retry, validation, atomicity and dismissal passed' as result;
rollback;
