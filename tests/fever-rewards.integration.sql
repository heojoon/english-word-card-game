-- Run against the linked production DB. All fixtures and wallet writes roll back.
begin;
do $test$
declare
  v_character uuid; v_guest uuid; v_owner uuid; v_class text; v_result record;
  v_start integer; v_expected integer; v_total integer; v_rejected boolean;
begin
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '{}', true);
  foreach v_class in array array['warrior','mage','pugilist','ranger'] loop
    insert into public.game_characters(player,name,class,coins)
      values('fever-test','fever-test',v_class,100) returning id into v_character;
    v_expected := case when v_class='pugilist' then 43 else 41 end;
    select * into v_result from public.award_game_result(v_character,'스토리 fever-test',20,20,true,60000,0,7);
    if v_result.coins_earned <> v_expected or v_result.balance <> 100+v_expected then
      raise exception 'wrong fever reward for %',v_class;
    end if;
    select coins_earned into v_total from public.game_scores where id=v_result.game_score_id;
    if v_total <> v_expected then raise exception 'score reward mismatch'; end if;
    select sum(amount) into v_total from public.coin_ledger where game_score_id=v_result.game_score_id;
    if v_total <> v_expected then raise exception 'ledger reward mismatch'; end if;
    select * into v_result from public.award_game_result(v_character,'스토리 fever-test',20,20,true,60000,0,7);
    if v_result.coins_earned <> 0 or v_result.balance <> 100+v_expected then
      raise exception 'story replay paid fever';
    end if;
  end loop;
  v_guest:=v_character;
  -- Validate both account wallet routing and simultaneous slash/fever bonuses.
  select user_id,crystal_balance into v_owner,v_start from public.profiles limit 1;
  if v_owner is null then raise exception 'account fixture unavailable'; end if;
  insert into public.game_characters(player,name,class,owner_user_id)
    values('fever-test','fever-test','warrior',v_owner) returning id into v_character;
  perform set_config('request.jwt.claim.sub',v_owner::text,true);
  select * into v_result from public.award_game_result(v_character,'스토리 fever-account-test',20,20,true,60000,6,7);
  if v_result.coins_earned <> 47 or v_result.balance <> v_start+47 then raise exception 'account fever mismatch'; end if;
  select crystal_balance into v_total from public.profiles where user_id=v_owner;
  if v_total <> v_start+47 then raise exception 'account wallet mismatch'; end if;
  select sum(amount) into v_total from public.coin_ledger where game_score_id=v_result.game_score_id;
  if v_total <> 47 then raise exception 'account ledger mismatch'; end if;
  perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  v_rejected:=false;
  begin
    perform public.award_game_result(v_character,'스토리 fever-other-owner',20,20,true,60000,0,7);
  exception when raise_exception then v_rejected:=true;
  end;
  if not v_rejected then raise exception 'ownership check bypassed'; end if;
  perform set_config('request.jwt.claim.sub','',true);
  -- Invalid requests must fail before changing balances or recording rewards.
  for v_result in select * from (values
    ('스토리 fever-invalid',20,20,-1), ('스토리 fever-invalid',20,20,111),
    ('스토리 fever-invalid',19,20,7), ('survival',20,20,7),
    ('스토리 fever-invalid',20,20,null)
  ) as cases(stage,correct,total,bonus) loop
    v_rejected:=false;
    begin
      perform public.award_game_result(v_guest,v_result.stage,v_result.correct,v_result.total,true,60000,0,v_result.bonus);
    exception when raise_exception then v_rejected:=true;
    end;
    if not v_rejected then raise exception 'invalid fever accepted'; end if;
  end loop;
end;
$test$;
select 'fever integration checks passed; fixtures rolled back' as result;
rollback;
