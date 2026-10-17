begin;
-- All fixtures are rolled back, including auth users and profile trigger effects.
insert into auth.users(id) values ('99999999-0000-4000-8000-000000000001'),('99999999-0000-4000-8000-000000000002');
insert into public.game_characters(id,player,name,class,owner_user_id) values
 ('99999999-0000-4000-8000-000000000011','vitals-test','vitals-test','mage','99999999-0000-4000-8000-000000000001'),
 ('99999999-0000-4000-8000-000000000012','vitals-test','vitals-test','warrior','99999999-0000-4000-8000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub','99999999-0000-4000-8000-000000000001',true);
insert into public.story_character_vitals(character_id,hp,mp) values ('99999999-0000-4000-8000-000000000011',1,0)
 on conflict(character_id) do update set hp=excluded.hp,mp=excluded.mp;
-- Same upsert path as the browser; zero must persist.
insert into public.story_character_vitals(character_id,hp,mp) values ('99999999-0000-4000-8000-000000000011',0,0)
 on conflict(character_id) do update set hp=excluded.hp,mp=excluded.mp;
do $test$
begin
  if not exists(select 1 from public.story_character_vitals where hp=0 and mp=0) then raise exception 'owner persistence failed'; end if;
  begin
    insert into public.story_character_vitals(character_id,hp,mp) values ('99999999-0000-4000-8000-000000000012',2,1);
    raise exception 'other character write allowed';
  exception when insufficient_privilege then null; end;
  begin
    update public.story_character_vitals set hp=-1;
    raise exception 'negative HP allowed';
  exception when check_violation then null; end;
end $test$;
-- A fresh auth session reads the same depleted values.
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claim.sub','99999999-0000-4000-8000-000000000001',true);
do $test$
begin
  if not exists(select 1 from public.story_character_vitals where hp=0 and mp=0) then raise exception 'relogin persistence failed'; end if;
end $test$;
select set_config('request.jwt.claim.sub','99999999-0000-4000-8000-000000000002',true);
do $test$
begin
  if exists(select 1 from public.story_character_vitals) then raise exception 'other account read allowed'; end if;
  update public.story_character_vitals set hp=5 where character_id='99999999-0000-4000-8000-000000000011';
  if found then raise exception 'other account update allowed'; end if;
end $test$;
set local role anon;
do $test$
begin
  begin
    perform 1 from public.story_character_vitals;
    raise exception 'anonymous read allowed';
  exception when insufficient_privilege then null; end;
end $test$;
reset role;
select 'Story HP/MP persistence, relogin, upsert, validation and owner-only RLS passed' as result;
rollback;
