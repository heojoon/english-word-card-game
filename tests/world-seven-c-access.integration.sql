-- Run against the linked production database; all fixtures are rolled back.
begin;
create temporary table world7c_access_probe(character_id uuid, stage text) on commit drop;
create trigger world7c_access_probe before insert on world7c_access_probe
  for each row execute function public.enforce_story_branch_result();
do $test$
declare
  c record;
  blocked boolean;
  fixture_score_id bigint;
begin
  select gc.id,gc.owner_user_id,gc.player into strict c
    from public.game_characters gc join public.profiles p on p.user_id=gc.owner_user_id
    where p.role='admin' limit 1;
  perform set_config('request.jwt.claim.sub','',true);
  blocked:=false;
  begin
    insert into world7c_access_probe values(c.id,'스토리 7C장 1 · 왕국 지하 던전');
  exception when others then
    if sqlerrm <> 'world seven owner access required' then raise; end if;
    blocked:=true;
  end;
  if not blocked then raise exception 'Anonymous access accepted'; end if;
  perform set_config('request.jwt.claim.sub',c.owner_user_id::text,true);
  insert into world7c_access_probe values(c.id,'스토리 7C장 1 · 왕국 지하 던전');
  update public.profiles set role='student' where user_id=c.owner_user_id;
  insert into public.story_branch_choices(user_id,branch) values(c.owner_user_id,'6A')
    on conflict(user_id) do update set branch='6A';
  blocked:=false;
  begin
    insert into world7c_access_probe values(c.id,'스토리 7C장 1 · 왕국 지하 던전');
  exception when others then
    if sqlerrm <> 'story branch access denied' then raise; end if;
    blocked:=true;
  end;
  if not blocked then raise exception 'Wrong branch accepted'; end if;
  update public.story_branch_choices set branch='6B' where user_id=c.owner_user_id;
  -- Temporarily hide existing prerequisite clears, if any, without deleting rows.
  update public.game_scores s set cleared=false from public.game_characters gc
    where gc.id=s.character_id and gc.owner_user_id=c.owner_user_id
      and s.stage in ('스토리 6장 20 · 왕국수도로 가는 길','스토리 6장 20 · 왕국수도로 가는 길 · 초등학생');
  blocked:=false;
  begin
    insert into world7c_access_probe values(c.id,'스토리 7C장 1 · 왕국 지하 던전');
  exception when others then
    if sqlerrm <> 'world six clear required' then raise; end if;
    blocked:=true;
  end;
  if not blocked then raise exception 'Missing prerequisite accepted'; end if;
  insert into public.game_scores(player,stage,correct,total,cleared,character_id,duration_ms,coins_earned)
    values(c.player,'스토리 6장 20 · 왕국수도로 가는 길',30,30,false,c.id,60000,0)
    returning id into fixture_score_id;
  update public.game_scores set cleared=true where id=fixture_score_id;
  insert into world7c_access_probe values(c.id,'스토리 7C장 1 · 왕국 지하 던전');
  update public.profiles set role='teacher' where user_id=c.owner_user_id;
  insert into world7c_access_probe values(c.id,'스토리 7C장 1 · 왕국 지하 던전');
end $test$;
select '7C owner, admin, branch, prerequisite, student and teacher checks passed' as result;
rollback;
