-- Production database fixtures are always rolled back; no real notice is sent.
begin;
do $test$
declare
  a uuid:=gen_random_uuid(); u uuid:=gen_random_uuid(); other_user uuid:=gen_random_uuid();
  hero uuid; other_hero uuid; item bigint; n uuid:=gen_random_uuid(); n2 uuid:=gen_random_uuid();
  c integer; rejected boolean; before_count integer;
begin
  insert into auth.users(id) values(a),(u),(other_user);
  insert into public.profiles(user_id,display_name,role) values(a,'notice-admin','admin'),(u,'notice-user','student'),(other_user,'notice-other','student')
    on conflict(user_id) do update set role=excluded.role;
  insert into public.game_characters(player,name,class,owner_user_id) values('notice-test','hero','warrior',u) returning id into hero;
  insert into public.game_characters(player,name,class,owner_user_id) values('notice-test','other','warrior',other_user) returning id into other_hero;
  select id into strict item from public.shop_items where active and code='gale_boots';
  perform set_config('request.jwt.claim.sub',u::text,true);
  rejected:=false;
  begin perform public.send_game_notice(n,'test','notice','body','selected',array[u],'[]');
    exception when raise_exception then if sqlerrm<>'admin required' then raise; end if; rejected:=true; end;
  if not rejected then raise exception 'non-admin sent notice'; end if;
  rejected:=false;
  begin perform public.admin_notice_users(''); exception when raise_exception then if sqlerrm<>'admin required' then raise; end if; rejected:=true; end;
  if not rejected then raise exception 'non-admin listed users'; end if;
  perform set_config('request.jwt.claim.sub',a::text,true);
  c:=public.send_game_notice(n,'<test>','event','line1'||chr(10)||'line2','selected',array[u,u],jsonb_build_array(jsonb_build_object('item_id',item,'quantity',2),jsonb_build_object('potion_type','red','quantity',3)));
  if c<>1 then raise exception 'recipient deduplication failed'; end if;
  c:=public.send_game_notice(n,'test','event','body','selected',array[u],'[]');
  if c<>1 or (select count(*) from public.game_notices where id=n)<>1 then raise exception 'send retry duplicated'; end if;
  if exists(select 1 from public.game_notice_receipts where notice_id=n and user_id=other_user) then raise exception 'private delivery leaked'; end if;
  rejected:=false;
  begin perform public.send_game_notice(gen_random_uuid(),'test','notice','body','selected',array[u],'[{"potion_type":"red","quantity":0}]');
    exception when raise_exception then if sqlerrm<>'invalid quantity' then raise; end if; rejected:=true; end;
  if not rejected then raise exception 'zero quantity allowed'; end if;
  perform set_config('request.jwt.claim.sub',other_user::text,true);
  rejected:=false;
  begin perform public.claim_game_notice(n,other_hero); exception when raise_exception then if sqlerrm<>'notice not found' then raise; end if; rejected:=true; end;
  if not rejected then raise exception 'other user claimed'; end if;
  perform set_config('request.jwt.claim.sub',u::text,true);
  rejected:=false;
  begin perform public.claim_game_notice(n,other_hero); exception when raise_exception then if sqlerrm<>'character not found' then raise; end if; rejected:=true; end;
  if not rejected then raise exception 'foreign character accepted'; end if;
  select count(*) into before_count from public.character_inventory where character_id=hero;
  perform public.claim_game_notice(n,hero); perform public.claim_game_notice(n,hero);
  if (select count(*) from public.character_inventory where character_id=hero)<>before_count+2 then raise exception 'equipment grant or retry failed'; end if;
  if (select red_potion_count from public.story_potion_inventory where character_id=hero)<>3 then raise exception 'potion grant failed'; end if;
  if exists(select 1 from public.pending_game_notices() where id=n) then raise exception 'claimed notice repeated'; end if;
  perform set_config('request.jwt.claim.sub',a::text,true);
  perform public.send_game_notice(n2,'dismiss','other','body','selected',array[u],'[]');
  perform set_config('request.jwt.claim.sub',u::text,true);
  perform public.dismiss_game_notice(n2);perform public.dismiss_game_notice(n2);
  if exists(select 1 from public.pending_game_notices() where id=n2) then raise exception 'dismissed notice repeated'; end if;
  rejected:=false;
  begin perform public.claim_game_notice(n2,hero); exception when raise_exception then if sqlerrm<>'notice dismissed' then raise; end if; rejected:=true; end;
  if not rejected then raise exception 'dismissed notice claimed'; end if;
  -- All-account receipt inserts, including existing real accounts, stay in this rolled-back transaction.
  perform set_config('notice_test.admin',a::text,true);
  perform set_config('notice_test.user',u::text,true);
  perform set_config('notice_test.other',other_user::text,true);
  perform set_config('notice_test.notice',n::text,true);
  perform set_config('notice_test.hero',hero::text,true);
  perform set_config('request.jwt.claim.sub',a::text,true);
  c:=public.send_game_notice(gen_random_uuid(),'all','notice','body','all',array[]::uuid[],'[]');
  if c<>(select count(*) from public.profiles) then raise exception 'all audience mismatch'; end if;
end $test$;
-- Exercise actual authenticated RLS, not the postgres bypass role.
set local role authenticated;
do $rls$
declare rejected boolean:=false;
begin
  perform set_config('request.jwt.claim.sub',current_setting('notice_test.other'),true);
  if exists(select 1 from public.game_notices where id=current_setting('notice_test.notice')::uuid) then raise exception 'RLS exposed targeted notice'; end if;
  if exists(select 1 from public.game_notice_receipts where user_id<>auth.uid()) then raise exception 'RLS exposed other receipts'; end if;
  begin
    insert into public.game_notice_receipts(notice_id,user_id) values(current_setting('notice_test.notice')::uuid,auth.uid());
    exception when insufficient_privilege then rejected:=true;
  end;
  if not rejected then raise exception 'direct receipt insert allowed'; end if;
  perform set_config('request.jwt.claim.sub',current_setting('notice_test.user'),true);
  if not exists(select 1 from public.game_notices where id=current_setting('notice_test.notice')::uuid) then raise exception 'RLS hid own notice'; end if;
  perform public.claim_game_notice(current_setting('notice_test.notice')::uuid,current_setting('notice_test.hero')::uuid);
  if has_function_privilege('anon','public.send_game_notice(uuid,text,text,text,text,uuid[],jsonb)','execute')
    or has_function_privilege('anon','public.claim_game_notice(uuid,uuid)','execute') then raise exception 'anon can call notice API'; end if;
end $rls$;
select 'notice permissions, RLS, delivery, rewards, idempotency and dismissal passed' as result;
reset role;
rollback;
