-- Run only against the linked remote DB. Every fixture is rolled back.
begin;
do $test$
declare
  owner_id uuid:=gen_random_uuid(); outsider_id uuid:=gen_random_uuid(); hero_id uuid:=gen_random_uuid();
  second_hero uuid:=gen_random_uuid(); request_id uuid:=gen_random_uuid();
  receipt jsonb; retry jsonb; replay jsonb; old_balance integer; score_count integer;
  expected integer; chosen integer; distribution integer[]; current_stage text:='스토리 8장 1 · 잿빛 종이 울리는 마을';
begin
  select array_agg(count::integer order by outcome) into distribution from
    (select private.story_roulette_index(bucket) as outcome,count(*) from generate_series(0,99) bucket group by 1) weights;
  if distribution is distinct from array[30,20,10,10,5,25] then raise exception 'wrong roulette probability distribution'; end if;
  if private.story_roulette_index(-1) is not null or private.story_roulette_index(100) is not null then raise exception 'invalid probability bucket accepted'; end if;
  if private.story_roulette_index(75)<>5 or round(59.501*1.5)<>89 then raise exception 'invalid 1.5 multiplier result'; end if;
  insert into auth.users(id,aud,role,email,raw_user_meta_data)
    values(owner_id,'authenticated','authenticated','roulette-'||owner_id||'@example.invalid','{"display_name":"Wheel QA"}'),
      (outsider_id,'authenticated','authenticated','roulette-'||outsider_id||'@example.invalid','{"display_name":"Wheel QA"}');
  insert into public.profiles(user_id,display_name,role) values(owner_id,'Wheel QA','student') on conflict(user_id) do nothing;
  insert into public.game_characters(id,owner_user_id,player,name,class)
    values(hero_id,owner_id,'wheelqa','Wheel QA','warrior'),
      (second_hero,owner_id,'wheelqa','Wheel Mage','mage');
  perform set_config('request.jwt.claim.sub',owner_id::text,true);

  -- Stage 1 requires a previous branch ending, not an invented stage title.
  begin
    perform public.claim_story_roulette_reward(request_id,hero_id,current_stage,40,40,180499,240000,0);
    raise exception 'expected previous world rejection';
  exception when others then
    if sqlerrm<>'previous world clear required' then raise; end if;
  end;
  insert into public.story_branch_choices(user_id,branch) values(owner_id,'6A');
  insert into public.game_scores(player,stage,correct,total,cleared,character_id,duration_ms,coins_earned,treasure_claimed)
    values('wheelqa','스토리 6A장 20 · 반전세계',20,20,true,hero_id,30000,500,true);
  insert into public.game_scores(player,stage,correct,total,cleared,character_id,duration_ms,coins_earned)
    values('wheelqa','스토리 7A장 30 · 심연의 불타는 고대 탑',30,30,true,hero_id,30000,0);
  select crystal_balance into old_balance from public.profiles where user_id=owner_id;
  receipt:=public.claim_story_roulette_reward(request_id,hero_id,current_stage,40,40,180499,240000,0);
  chosen:=(receipt->>'index')::integer;
  expected:=round(59.501*(array[1,2,3,0.5,0,1.5]::numeric[])[chosen+1]);
  if chosen<0 or chosen>5 or (receipt->>'bonus')::integer<>expected then raise exception 'invalid result formula'; end if;
  if (receipt->'result'->>'coins_earned')::integer<>58+expected then raise exception 'base plus bonus mismatch'; end if;
  if (select crystal_balance from public.profiles where user_id=owner_id)<>old_balance+58+expected then raise exception 'wallet payout mismatch'; end if;
  if (select coalesce(sum(amount),0) from public.coin_ledger where game_score_id=(receipt->'result'->>'game_score_id')::bigint)<>58+expected then raise exception 'ledger mismatch'; end if;
  retry:=public.claim_story_roulette_reward(request_id,hero_id,current_stage,40,40,180499,240000,0);
  if retry<>receipt then raise exception 'retry changed receipt'; end if;
  select count(*) into score_count from public.game_scores where character_id=hero_id and stage=current_stage;
  if score_count<>1 then raise exception 'retry duplicated score'; end if;

  replay:=public.claim_story_roulette_reward(gen_random_uuid(),second_hero,current_stage,40,40,180499,240000,0);
  if (replay->'result'->>'coins_earned')::integer<>0 then raise exception 'cross-character replay paid again'; end if;
  if (select crystal_balance from public.profiles where user_id=owner_id)<>old_balance+58+expected then raise exception 'replay modified wallet'; end if;
  -- A warrior can finish after the original 240-second budget.
  retry:=public.claim_story_roulette_reward(gen_random_uuid(),hero_id,'스토리 8장 2 · 잿빛 종이 울리는 마을',40,40,280499,320000,0);
  expected:=round(39.501*(array[1,2,3,0.5,0,1.5]::numeric[])[(retry->>'index')::integer+1]);
  if (retry->>'bonus')::integer<>expected then raise exception 'passive time bonus mismatch'; end if;
  begin
    perform public.claim_story_roulette_reward(gen_random_uuid(),second_hero,current_stage,40,40,180499,320000,0);
    raise exception 'expected non-warrior time limit rejection';
  exception when others then if sqlerrm<>'invalid roulette clear' then raise; end if; end;
  begin
    perform public.claim_story_roulette_reward(request_id,second_hero,current_stage,40,40,180499,240000,0);
    raise exception 'expected receipt mismatch rejection';
  exception when others then if sqlerrm<>'roulette request mismatch' then raise; end if; end;
  begin
    perform public.claim_story_roulette_reward(gen_random_uuid(),hero_id,'스토리 8장 15 · 잿빛 종이 울리는 마을',40,40,180499,240000,0);
    raise exception 'expected boss rejection';
  exception when others then if sqlerrm<>'boss has no roulette fever' then raise; end if; end;
  perform set_config('request.jwt.claim.sub',outsider_id::text,true);
  begin
    perform public.claim_story_roulette_reward(request_id,hero_id,current_stage,40,40,180499,240000,0);
    raise exception 'expected ownership rejection';
  exception when others then if sqlerrm<>'character not found' then raise; end if; end;
end $test$;
rollback;
select 'roulette formula, wallet, ledger, idempotency, replay, stage and ownership checks passed; fixtures rolled back' as verification;
