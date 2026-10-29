-- Run explicitly against the linked remote DB. Every fixture and wallet change
-- is rolled back; this is intentionally outside the default Node test suite.
begin;
do $$
declare
  v_owner uuid; v_a uuid := gen_random_uuid(); v_b uuid := gen_random_uuid();
  v_notice uuid; v_amount integer; v_balance bigint; v_before bigint;
  v_start timestamptz := '2000-01-03 00:00:00+09';
  v_end timestamptz := '2000-01-10 00:00:00+09';
begin
  select user_id into strict v_owner from public.profiles where login_id is not null limit 1;
  assert (select label from private.story_clear_position('스토리 LV.1 · 속삭이는 숲')) = '1-2';
  assert (select label from private.story_clear_position('스토리 6장 20 · 왕국수도로 가는 길')) = '6B-20';
  assert (select stage_value from private.story_clear_position('스토리 7C장 30 · 왕국 지하 던전 · 초등학생')) = 7030;
  assert not exists(select 1 from private.story_clear_position('보스 · 소서러스'));
  assert not exists(select 1 from private.story_clear_position('스토리 99장 99999999999999999999 · 오류'));
  assert not exists(select 1 from private.story_clear_position('스토리 8장 31 · 범위 밖'));

  insert into public.game_characters(id,player,name,class,owner_user_id,created_at) values
    (v_a,'HallTest','HallTestA','mage',v_owner,v_start-interval '1 day'),
    (v_b,'HallTest','HallTestB','mage',v_owner,v_start-interval '1 day');
  -- One high-stage clear beats twenty low-stage clears. Failed higher attempts
  -- and a later replay of an early stage must not replace the completed stage.
  insert into public.game_scores(player,character_id,stage,correct,total,cleared,created_at)
    values ('HallTest',v_a,'스토리 8장 29 · 테스트',1000000,1000000,true,v_start),
      ('HallTest',v_a,'스토리 8장 30 · 테스트',0,40,false,v_start+interval '1 hour'),
      ('HallTest',v_a,'스토리 1 · 속삭이는 숲',1,1,true,v_start+interval '2 hours');
  insert into public.game_scores(player,character_id,stage,correct,total,cleared,created_at)
    select 'HallTest',v_b,'스토리 4장 '||n||' · 테스트',1,1,true,v_start from generate_series(1,20) n;
  assert (select character_id from private.hall_of_fame_at(v_end,v_start)
    where category='story' and rank=1) = v_a, 'rank must use completed stage, not clear count';
  assert (select last_story_stage from private.hall_of_fame_at(v_end,v_start)
    where category='story' and character_id=v_a) = '8-29', 'failed attempts and replays must not advance or lower progress';
  assert exists(select 1 from public.hall_of_fame() where category='story' and rank=1
    and character_name='HallTestA' and value=2 and last_story_stage='8-29'),
    'public summary must preserve old numeric counts while ranking by completed stage';

  -- Half-open KST week: exact Monday start included, next Monday excluded.
  insert into public.game_scores(player,character_id,stage,correct,total,cleared,created_at)
    values ('HallTest',v_a,'HallTest',1,1,true,v_start-interval '1 microsecond'),
      ('HallTest',v_a,'HallTest',1,1,true,v_start),
      ('HallTest',v_a,'HallTest',1,1,true,v_end-interval '1 microsecond'),
      ('HallTest',v_a,'HallTest',1,1,true,v_end);
  assert (select value from private.hall_of_fame_at(v_end,v_start)
    where category='survival' and character_id=v_a) = 2, 'week boundaries must be exact';
  assert private.award_hall_of_fame_week('2026-10-19') = 0, 'no prelaunch awards';
  begin
    perform private.award_hall_of_fame_week((date_trunc('week',now() at time zone 'Asia/Seoul')::date));
    raise exception 'unfinished week accepted';
  exception when raise_exception then
    if sqlerrm <> 'a completed Monday-Sunday week is required' then raise; end if;
  end;
  assert not has_function_privilege('anon','private.award_hall_of_fame_week(date)','execute');
  assert not has_function_privilege('authenticated','private.award_hall_of_fame_week(date)','execute');
  assert not has_function_privilege('authenticated','private.hall_of_fame_at(timestamptz,timestamptz)','execute');
  assert not has_table_privilege('authenticated','private.hall_of_fame_awards','insert');

  -- Exercise the real claim RPC for each award amount, including repeated calls
  -- and account currency delivery without a selected character.
  perform set_config('request.jwt.claim.sub',v_owner::text,true);
  select crystal_balance into v_before from public.profiles where user_id=v_owner;
  foreach v_amount in array array[300,200,100,500] loop
    v_notice := gen_random_uuid();
    insert into public.game_notices(id,title,kind,body,audience,rewards)
      values(v_notice,'Hall test','event','Rollback-only test','selected',
        jsonb_build_array(jsonb_build_object('currency','crystals','quantity',v_amount,'name','크리스털')));
    insert into public.game_notice_receipts(notice_id,user_id) values(v_notice,v_owner);
    assert exists(select 1 from public.pending_game_notices() where id=v_notice);
    perform public.claim_game_notice(v_notice,null);
    perform public.claim_game_notice(v_notice,null);
    v_before := v_before + v_amount;
    select crystal_balance into v_balance from public.profiles where user_id=v_owner;
    assert v_balance = v_before, 'repeated claims must credit exactly once';
    assert not exists(select 1 from public.pending_game_notices() where id=v_notice);
  end loop;
end $$;
rollback;
