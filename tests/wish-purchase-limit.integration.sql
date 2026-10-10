-- Execute on the production DB; all fixtures and wallet changes roll back.
begin;
do $test$
declare
  v_owner uuid := gen_random_uuid();
  v_other uuid := gen_random_uuid();
  v_one uuid; v_two uuid; v_other_character uuid;
  v_item bigint; v_price integer; v_balance integer; v_count integer;
  v_day timestamptz := date_trunc('day',clock_timestamp() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';
  v_rejected boolean;
begin
  insert into auth.users(id) values(v_owner),(v_other);
  insert into public.profiles(user_id,display_name,crystal_balance)
    values(v_owner,'wish-test',10000),(v_other,'wish-test',10000)
    on conflict(user_id) do update set crystal_balance=10000;
  insert into public.game_characters(player,name,class,owner_user_id)
    values('wish-test','wish-one','warrior',v_owner) returning id into v_one;
  insert into public.game_characters(player,name,class,owner_user_id)
    values('wish-test','wish-two','mage',v_owner) returning id into v_two;
  insert into public.game_characters(player,name,class,owner_user_id)
    values('wish-test','wish-other','ranger',v_other) returning id into v_other_character;
  select id,price into strict v_item,v_price from public.shop_items where code='wish' and active;
  -- Yesterday's six purchases must not consume today's quota.
  insert into public.reward_redemptions(character_id,item_id,price_paid,created_at)
    select v_one,v_item,v_price,v_day-interval '1 second' from generate_series(1,6);
  perform set_config('request.jwt.claim.sub',v_owner::text,true);
  for i in 1..6 loop
    perform public.purchase_shop_item(case when i%2=0 then v_two else v_one end,v_item);
  end loop;
  select crystal_balance into v_balance from public.profiles where user_id=v_owner;
  if v_balance<>10000-6*v_price then raise exception 'six purchases wallet mismatch'; end if;
  update public.reward_redemptions set status='cancelled' where character_id=v_two;
  v_rejected:=false;
  begin
    perform public.purchase_shop_item(v_two,v_item);
  exception when raise_exception then
    if sqlerrm <> 'wish daily purchase limit' then raise; end if;
    v_rejected:=true;
  end;
  if not v_rejected then raise exception 'seventh wish purchase accepted'; end if;
  if (select crystal_balance from public.profiles where user_id=v_owner)<>v_balance then
    raise exception 'rejected purchase charged wallet';
  end if;
  select count(*) into v_count from public.coin_ledger where character_id in (v_one,v_two) and item_id=v_item;
  if v_count<>6 then raise exception 'rejected purchase added ledger entry'; end if;
  select count(*) into v_count from public.reward_redemptions where character_id in (v_one,v_two) and created_at>=v_day;
  if v_count<>6 then raise exception 'rejected purchase added redemption'; end if;
  -- Other rewards are unaffected after reaching the wish limit.
  insert into public.shop_items(code,name,category,price,icon,repeatable,active)
    values('wish-test-other-'||v_owner::text,'test reward','gift',10,'◆',true,true);
  perform public.purchase_shop_item(v_one,(select id from public.shop_items where code='wish-test-other-'||v_owner::text));
  -- Another account has its own quota.
  perform set_config('request.jwt.claim.sub',v_other::text,true);
  perform public.purchase_shop_item(v_other_character,v_item);
  v_rejected:=false;
  begin
    perform public.purchase_shop_item(v_one,v_item);
  exception when raise_exception then
    if sqlerrm <> 'character not found' then raise; end if;
    v_rejected:=true;
  end;
  if not v_rejected then raise exception 'owner check bypassed'; end if;
  -- Move today's requests to yesterday to verify a fresh day restores quota.
  update public.reward_redemptions set created_at=v_day-interval '1 second'
    where character_id in (v_one,v_two) and item_id=v_item;
  perform set_config('request.jwt.claim.sub',v_owner::text,true);
  perform public.purchase_shop_item(v_one,v_item);
end;
$test$;
select 'wish daily purchase integration checks passed; fixtures rolled back' as result;
rollback;
