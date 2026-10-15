-- Run against the linked production database. All fixtures are rolled back.
begin;
do $test$
declare
  v_owner uuid:=gen_random_uuid(); v_other uuid:=gen_random_uuid();
  v_hero uuid:=gen_random_uuid(); v_alt uuid:=gen_random_uuid(); v_foreign uuid:=gen_random_uuid();
  v_result jsonb; v_count integer; v_milestone integer;
begin
  insert into auth.users(id) values(v_owner),(v_other);
  insert into public.game_characters(id,owner_user_id,player,name,class)
    values(v_hero,v_owner,'율이','보급 테스트','warrior'),
      (v_alt,v_owner,'율이','보급 테스트 2','mage'),
      (v_foreign,v_other,'율이','다른 계정 테스트','ranger');
  insert into public.story_potion_inventory(character_id,red_potion_count,blue_potion_count,equipped_slot_1,equipped_slot_2,potion_count_model)
    values(v_hero,2,3,'red','blue','remaining');
  perform set_config('request.jwt.claim.sub',v_owner::text,true);
  begin
    perform public.claim_world_four_potion_event(v_hero,4);
    raise exception 'test: missing progress was accepted';
  exception when others then
    if sqlerrm<>'milestone not cleared' then raise; end if;
  end;
  for v_milestone in 1..20 loop
    if v_milestone not in (4,8,12,16) then
      begin
        perform public.claim_world_four_potion_event(v_hero,v_milestone);
        raise exception 'test: invalid milestone was accepted';
      exception when others then
        if sqlerrm<>'invalid milestone' then raise; end if;
      end;
    end if;
  end loop;
  begin
    perform public.claim_world_four_potion_event(v_foreign,4);
    raise exception 'test: foreign character was accepted';
  exception when others then
    if sqlerrm<>'character not found' then raise; end if;
  end;
  insert into public.game_scores(player,character_id,stage,correct,total,cleared)
    select '율이',case when n%2=0 then v_alt else v_hero end,
      format('스토리 4장 %s · 환각의 숲과 버려진 성%s',n,case when n%2=0 then ' · 초등학생' else '' end),30,30,true
    from generate_series(1,16) as stages(n) where n<>3;
  begin
    perform public.claim_world_four_potion_event(v_hero,4);
    raise exception 'test: incomplete prefix was accepted';
  exception when others then
    if sqlerrm<>'milestone not cleared' then raise; end if;
  end;
  insert into public.game_scores(player,character_id,stage,correct,total,cleared)
    values('율이',v_hero,'스토리 4장 3 · 환각의 숲과 버려진 성',30,30,true);
  foreach v_milestone in array array[4,8,12,16] loop
    v_result:=public.claim_world_four_potion_event(v_hero,v_milestone);
    if (v_result->>'potion_count')::integer<>3 or (v_result->>'already_claimed')::boolean then
      raise exception 'test: first reward mismatch';
    end if;
    v_result:=public.claim_world_four_potion_event(v_hero,v_milestone);
    if (v_result->>'potion_count')::integer<>0 or not (v_result->>'already_claimed')::boolean then
      raise exception 'test: repeated reward mismatch';
    end if;
    update public.profiles set learning_level='elementary' where user_id=v_owner;
    v_result:=public.claim_world_four_potion_event(v_alt,v_milestone);
    if (v_result->>'potion_count')::integer<>0 then raise exception 'test: character or level change duplicated reward'; end if;
  end loop;
  select red_potion_count into v_count from public.story_potion_inventory where character_id=v_hero;
  if v_count<>14 then raise exception 'test: expected exactly 12 awarded healing potions'; end if;
  if exists(select 1 from public.story_potion_inventory where character_id=v_alt and red_potion_count>0) then
    raise exception 'test: duplicate reward reached another character';
  end if;
  v_result:=(select to_jsonb(i) from public.get_story_potion_inventory(v_hero) i);
  if v_result->>'equipped_slot_1'<>'red' or v_result->>'equipped_slot_2'<>'blue'
    or (v_result->>'blue_potion_count')::integer<>3 then raise exception 'test: loadout or mana inventory changed'; end if;
  if has_function_privilege('anon','public.claim_world_four_potion_event(uuid,integer)','EXECUTE')
    or has_table_privilege('authenticated','public.world_four_potion_rewards','INSERT') then
    raise exception 'test: unauthorized reward write privileges';
  end if;
  execute 'set local role authenticated';
  select count(*) into v_count from public.world_four_potion_rewards;
  if v_count<>4 then raise exception 'test: owner cannot read four receipts'; end if;
  perform set_config('request.jwt.claim.sub',v_other::text,true);
  select count(*) into v_count from public.world_four_potion_rewards;
  if v_count<>0 then raise exception 'test: RLS exposed another account receipts'; end if;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub','',true);
  begin
    perform public.claim_world_four_potion_event(v_hero,4);
    raise exception 'test: unauthenticated request was accepted';
  exception when others then
    if sqlerrm<>'character not found' then raise; end if;
  end;
end $test$;
rollback;
select 'World 4 rewards, retry, ownership, progression, inventory and RLS checks passed; fixtures rolled back' as result;
