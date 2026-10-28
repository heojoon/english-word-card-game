-- Match administrator stage skipping in storyStageUnlocked().
-- Only prior-stage checks are bypassed; ownership, victory, encounter conditions and receipts remain enforced.
-- World 7A stage 15: account-wide first-clear reward and shared story record.
create or replace function public.claim_keurus_reward(
  p_character_id uuid, p_correct integer, p_duration_ms integer, p_boss_hp integer
)
returns table(game_score_id bigint, reward integer, balance integer)
language plpgsql security definer set search_path = '' as $function$
declare
  v_owner uuid; v_player text; v_score bigint; v_balance integer; v_reward integer;
  v_stage constant text := '스토리 7A장 15 · 심연의 불타는 고대 탑';
begin
  select c.owner_user_id,c.player into v_owner,v_player
    from public.game_characters c where c.id=p_character_id for update;
  if not found or v_owner is null or auth.uid() is distinct from v_owner then
    raise exception 'character not found';
  end if;
  if p_boss_hp is distinct from 0 or p_correct is null or p_correct<1 or p_correct>200
    or p_duration_ms is null or p_duration_ms<=0 or p_duration_ms>300000 then
    raise exception 'invalid boss result';
  end if;
  select p.crystal_balance into v_balance from public.profiles p
    where p.user_id=v_owner for update;
  if not found then raise exception 'account wallet unavailable'; end if;
  if not exists(select 1 from public.profiles p where p.user_id=v_owner and p.role='admin')
    and not exists(select 1 from public.game_scores s
    join public.game_characters c on c.id=s.character_id
    where c.owner_user_id=v_owner and s.stage='스토리 7A장 14 · 심연의 불타는 고대 탑' and s.cleared) then
    raise exception 'previous stage clear required';
  end if;
  select l.game_score_id into v_score from public.coin_ledger l
    join public.game_characters c on c.id=l.character_id
    where c.owner_user_id=v_owner and l.reason='keurus_reward'
    order by l.id limit 1;
  v_reward:=case when v_score is null then 400 else 0 end;
  insert into public.game_scores(player,stage,correct,total,cleared,character_id,duration_ms,coins_earned,treasure_claimed)
    values(v_player,v_stage,p_correct,p_correct,true,p_character_id,p_duration_ms,v_reward,true)
    returning id into v_score;
  if v_reward>0 then
    update public.profiles set crystal_balance=crystal_balance+v_reward,updated_at=now()
      where user_id=v_owner returning crystal_balance into v_balance;
    insert into public.coin_ledger(character_id,amount,reason,stage,game_score_id)
      values(p_character_id,v_reward,'keurus_reward',v_stage,v_score);
  end if;
  return query select v_score,v_reward,v_balance;
end $function$;
revoke all on function public.claim_keurus_reward(uuid,integer,integer,integer) from public,anon;
grant execute on function public.claim_keurus_reward(uuid,integer,integer,integer) to authenticated;

-- Separate hidden-boss reward; ordinary 3-7 completion never consumes it.
create or replace function public.claim_crystal_ghost_boss_reward(
  p_character_id uuid, p_correct integer, p_duration_ms integer
)
returns table(game_score_id bigint, reward integer, balance integer, mana_potions integer)
language plpgsql security definer set search_path = '' as $function$
declare
  v_owner uuid; v_player text; v_score bigint; v_balance integer;
  v_stage constant text := '스토리 3장 7 · 하늘 수정 성소';
  v_hidden constant text := '보스 · 숨겨진 크리스탈 유령';
begin
  select c.owner_user_id,c.player into v_owner,v_player
    from public.game_characters c where c.id=p_character_id for update;
  if not found or v_owner is null or auth.uid() is distinct from v_owner then
    raise exception 'character not found';
  end if;
  if p_correct is distinct from 90 or p_duration_ms is null
    or p_duration_ms<=0 or p_duration_ms>630000 then
    raise exception 'invalid boss result';
  end if;
  if not exists(select 1 from public.character_inventory i
    join public.shop_items s on s.id=i.item_id
    where i.character_id=p_character_id and s.code='pet') then
    raise exception 'word crystal spirit required';
  end if;
  if not exists(select 1 from public.profiles p where p.user_id=v_owner and p.role='admin')
    and not exists(select 1 from public.game_scores s
    join public.game_characters c on c.id=s.character_id
    where c.owner_user_id=v_owner and s.cleared
      and s.stage='스토리 3장 6 · 하늘 수정 성소') then
    raise exception 'stage locked';
  end if;
  -- All characters sharing a wallet serialize here, including concurrent retries.
  select p.crystal_balance into v_balance from public.profiles p
    where p.user_id=v_owner for update;
  if not found then raise exception 'account wallet unavailable'; end if;
  select l.game_score_id into v_score from public.coin_ledger l
    join public.game_characters c on c.id=l.character_id
    where c.owner_user_id=v_owner and l.reason='crystal_ghost_boss_reward'
    order by l.id limit 1;
  if found then
    return query select v_score,0,v_balance,0;
    return;
  end if;
  insert into public.game_scores(player,stage,correct,total,cleared,character_id,duration_ms,coins_earned,treasure_claimed)
    values(v_player,v_hidden,90,90,true,p_character_id,p_duration_ms,2200,true)
    returning id into v_score;
  -- Unlock World 3-8 without ordinary/chest rewards or learning-level suffixes.
  insert into public.game_scores(player,stage,correct,total,cleared,character_id,duration_ms,coins_earned,treasure_claimed)
    values(v_player,v_stage,90,90,true,p_character_id,p_duration_ms,0,true);
  update public.profiles set crystal_balance=crystal_balance+2200,updated_at=now()
    where user_id=v_owner returning crystal_balance into v_balance;
  insert into public.coin_ledger(character_id,amount,reason,stage,game_score_id)
    values(p_character_id,2200,'crystal_ghost_boss_reward',v_hidden,v_score);
  insert into public.story_potion_inventory(character_id,blue_potion_count)
    values(p_character_id,5)
    on conflict(character_id) do update
      set blue_potion_count=public.story_potion_inventory.blue_potion_count+5;
  return query select v_score,2200,v_balance,5;
end $function$;
revoke all on function public.claim_crystal_ghost_boss_reward(uuid,integer,integer) from public,anon;
grant execute on function public.claim_crystal_ghost_boss_reward(uuid,integer,integer) to authenticated;
