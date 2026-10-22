-- Production regression check; every temporary write is rolled back.
begin;
do $test$
declare c record; label text; test_role text; score_id bigint; blocked boolean;
begin
  select gc.id,gc.owner_user_id,gc.player into c from public.game_characters gc
    join public.profiles p on p.user_id=gc.owner_user_id where p.role='admin' limit 1;
  if not found then raise exception 'No admin character available'; end if;
  perform set_config('request.jwt.claim.sub',c.owner_user_id::text,true);
  foreach label in array array['스토리 7A장 1 · 심연의 불타는 고대 탑','스토리 7B장 1 · 심연의 검은 호수'] loop
    insert into public.game_scores(player,stage,correct,total,cleared,character_id,duration_ms,coins_earned)
      values(c.player,label,0,30,false,c.id,1000,0) returning id into score_id;
    foreach test_role in array array['student','teacher'] loop
      update public.profiles set role=test_role where user_id=c.owner_user_id;
      blocked:=false;
      begin
        insert into public.game_scores(player,stage,correct,total,cleared,character_id,duration_ms,coins_earned)
          values(c.player,label,0,30,false,c.id,1000,0);
      exception when others then
        if sqlerrm <> 'world seven admin access required' then raise; end if;
        blocked:=true;
      end;
      if not blocked then raise exception 'Non-admin insert accepted'; end if;
      blocked:=false;
      begin update public.game_scores set correct=1 where id=score_id;
      exception when others then
        if sqlerrm <> 'world seven admin access required' then raise; end if;
        blocked:=true;
      end;
      if not blocked then raise exception 'Non-admin update accepted'; end if;
    end loop;
    update public.profiles set role='admin' where user_id=c.owner_user_id;
    perform set_config('request.jwt.claim.sub','',true);
    blocked:=false;
    begin update public.game_scores set correct=1 where id=score_id;
    exception when others then
      if sqlerrm <> 'world seven admin access required' then raise; end if;
      blocked:=true;
    end;
    if not blocked then raise exception 'Anonymous update accepted'; end if;
    perform set_config('request.jwt.claim.sub',c.owner_user_id::text,true);
  end loop;
end $test$;
rollback;
