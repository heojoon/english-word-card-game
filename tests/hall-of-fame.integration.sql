-- Temporary fixtures only; all writes roll back on the linked production DB.
begin;
do $test$
declare
  owner_id uuid:=gen_random_uuid(); hero uuid; result bigint; last_stage text;
  week_start timestamptz:=date_trunc('week', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';
  test_login text:='hof-'||left(replace(owner_id::text,'-',''),12);
begin
  insert into auth.users(id) values(owner_id);
  update public.profiles set login_id=test_login where user_id=owner_id;
  insert into public.game_characters(player,name,class,owner_user_id)
    values('hof-test','hof-test','warrior',owner_id) returning id into hero;
  -- Sufficient correct answers for LV.100; a failed run still awards EXP.
  insert into public.game_scores(player,stage,correct,total,cleared,character_id)
    values('hof-test','Stage 1',1000000,1000001,false,hero);
  select value into result from public.hall_of_fame()
    where category='level' and player_name=test_login;
  if result is distinct from 100 then raise exception 'level formula or failed-run EXP incorrect: %',result; end if;
  insert into public.game_scores(player,stage,correct,total,cleared,character_id)
    values('hof-test','스토리 LV.1 · 속삭이는 숲',1,1,true,hero);
  select last_story_stage into last_stage from public.hall_of_fame()
    where category='story' and player_name=test_login;
  if last_stage is distinct from '1-2' then raise exception 'legacy forest stage incorrect: %',last_stage; end if;
  delete from public.game_scores where character_id=hero and cleared;
  insert into public.game_scores(player,stage,correct,total,cleared,character_id)
    select 'hof-test','스토리 '||n||' · hof-test',1,1,true,hero from generate_series(1,300)n;
  insert into public.game_scores(player,stage,correct,total,cleared,character_id)
    values('hof-test','스토리 1 · hof-test',1,1,true,hero),
          ('hof-test','스토리 1 · hof-test · 초등학생',1,1,true,hero),
          ('hof-test','보스 · hof-test',1,1,true,hero);
  select value into result from public.hall_of_fame()
    where category='story' and player_name=test_login;
  if result is distinct from 300 then raise exception 'story replays/learning levels counted twice: %',result; end if;
  insert into public.game_scores(player,stage,correct,total,cleared,character_id)
    values('hof-test','스토리 6장 9 · 왕국수도로 가는 길',1,1,true,hero),
          ('hof-test','스토리 6장 10 · 왕국수도로 가는 길 · 초등학생',1,1,true,hero),
          ('hof-test','스토리 6장 20 · 왕국수도로 가는 길',0,1,false,hero),
          ('hof-test','스토리 1 · hof-test',1,1,true,hero);
  select last_story_stage into last_stage from public.hall_of_fame()
    where category='story' and player_name=test_login;
  if last_stage is distinct from '6B-10' then raise exception 'numeric stage order, failed run or replay incorrect: %',last_stage; end if;
  insert into public.game_scores(player,stage,correct,total,cleared,character_id)
    values('hof-test','스토리 6A장 20 · 반전세계',1,1,true,hero);
  select last_story_stage into last_stage from public.hall_of_fame()
    where category='story' and player_name=test_login;
  if last_stage is distinct from '6A-20' then raise exception 'world 6A branch incorrect: %',last_stage; end if;
  insert into public.game_scores(player,stage,correct,total,cleared,character_id)
    values('hof-test','스토리 7B장 15 · 심연의 검은 호수 · 초등학생',1,1,true,hero),
          ('hof-test','스토리 7B장 30 · 심연의 검은 호수',0,1,false,hero);
  select last_story_stage into last_stage from public.hall_of_fame()
    where category='story' and player_name=test_login;
  if last_stage is distinct from '7B-15' then raise exception 'world 7 progression incorrect: %',last_stage; end if;
  insert into public.game_scores(player,stage,correct,total,cleared,character_id)
    select 'hof-test','Stage 1',1,1,true,hero from generate_series(1,300);
  select value into result from public.hall_of_fame()
    where category='survival' and player_name=test_login;
  if result is distinct from 300 then raise exception 'survival repeats, failures, or bosses incorrect: %',result; end if;
  -- Previous weeks and future timestamps never inflate this week's score.
  insert into public.game_scores(player,stage,correct,total,cleared,character_id,created_at)
    select 'hof-test','Stage 1',1,1,true,hero,week_start-interval '1 millisecond' from generate_series(1,500);
  insert into public.game_scores(player,stage,correct,total,cleared,character_id,created_at)
    values('hof-test','Stage 1',1,1,true,hero,week_start),
          ('hof-test','Stage 1',1,1,true,hero,week_start+interval '7 days');
  select value into result from public.hall_of_fame()
    where category='survival' and player_name=test_login;
  if result is distinct from 301 then raise exception 'Korea Monday boundary incorrect: %',result; end if;
  if not exists(select 1 from public.hall_of_fame() where player_name=test_login and character_class='warrior' and avatar_variant='male') then
    raise exception 'missing matching SD identity';
  end if;
  if exists(select category from public.hall_of_fame() group by category having count(*)>3) then
    raise exception 'more than three entries in a category';
  end if;
end;
$test$;
set local role anon;
select count(*) <= 9 as public_summary_is_bounded from public.hall_of_fame();
rollback;
