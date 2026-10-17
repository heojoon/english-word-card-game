-- World 5-10: account-wide first victory grants both rewards atomically.
create or replace function public.claim_sorcerus_midboss_reward(
  p_character_id uuid, p_correct integer, p_duration_ms integer
)
returns table(game_score_id bigint, reward integer, balance integer, healing_potions integer, inventory jsonb)
language plpgsql security definer set search_path = '' as $function$
declare
  v_owner uuid; v_player text; v_score bigint; v_balance integer; v_inventory jsonb;
  v_stage constant text := '스토리 5장 10 · 보랏빛 수정동굴';
begin
  select c.owner_user_id,c.player into v_owner,v_player
    from public.game_characters c where c.id=p_character_id for update;
  if not found or v_owner is null or auth.uid() is distinct from v_owner then
    raise exception 'character not found';
  end if;
  -- Healing can make the accumulated damage exceed the boss's initial 120 HP.
  if p_correct is null or p_correct<120 or p_correct>240 or p_duration_ms is null
    or p_duration_ms<=0 or p_duration_ms>360000 then
    raise exception 'invalid boss result';
  end if;
  -- Serialize claims across characters sharing this account wallet.
  select p.crystal_balance into v_balance from public.profiles p
    where p.user_id=v_owner for update;
  if not found then raise exception 'account wallet unavailable'; end if;
  select l.game_score_id into v_score from public.coin_ledger l
    join public.game_characters c on c.id=l.character_id
    where c.owner_user_id=v_owner and l.reason='sorcerus_midboss_reward'
    order by l.id limit 1;
  if found then
    -- A real victory restores a reset clear without granting the rewards twice.
    update public.game_scores set cleared=true,correct=p_correct,total=p_correct,duration_ms=p_duration_ms
      where id=v_score and not cleared;
    select to_jsonb(i) into v_inventory from public.get_story_potion_inventory(p_character_id) i;
    return query select v_score,0,v_balance,0,v_inventory;
    return;
  end if;
  insert into public.game_scores(player,stage,correct,total,cleared,character_id,duration_ms,coins_earned,treasure_claimed)
    values(v_player,v_stage,p_correct,p_correct,true,p_character_id,p_duration_ms,500,true)
    returning id into v_score;
  update public.profiles set crystal_balance=crystal_balance+500,updated_at=now()
    where user_id=v_owner returning crystal_balance into v_balance;
  insert into public.coin_ledger(character_id,amount,reason,stage,game_score_id)
    values(p_character_id,500,'sorcerus_midboss_reward',v_stage,v_score);
  insert into public.story_potion_inventory(character_id,red_potion_count)
    values(p_character_id,5)
    on conflict(character_id) do update
      set red_potion_count=public.story_potion_inventory.red_potion_count+5;
  select to_jsonb(i) into v_inventory from public.get_story_potion_inventory(p_character_id) i;
  return query select v_score,500,v_balance,5,v_inventory;
end $function$;
revoke all on function public.claim_sorcerus_midboss_reward(uuid,integer,integer) from public,anon;
grant execute on function public.claim_sorcerus_midboss_reward(uuid,integer,integer) to authenticated;

-- One-time reset across all accounts and both historical learning-level names.
-- Preserve scores, wallets, inventories and the reward ledger.
update public.game_scores set cleared=false
  where cleared and stage in (
    '스토리 5장 10 · 보랏빛 수정동굴',
    '스토리 5장 10 · 보랏빛 수정동굴 · 초등학생'
  );
