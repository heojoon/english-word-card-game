-- World 10 bosses pay a fixed 500 crystals once per account and stage.
create or replace function public.claim_world_ten_reward(
  p_character_id uuid, p_stage text, p_correct integer, p_duration_ms integer, p_boss_hp integer
)
returns table(game_score_id bigint, reward integer, balance integer)
language plpgsql security definer set search_path = '' as $function$
declare
  v_owner uuid; v_player text; v_score bigint; v_balance integer; v_reward integer;
  v_stage text := p_stage;
begin
  select c.owner_user_id,c.player into v_owner,v_player
    from public.game_characters c where c.id=p_character_id for update;
  if not found or v_owner is null or auth.uid() is distinct from v_owner then
    raise exception 'character not found';
  end if;
  if p_stage is null or p_stage not in ('스토리 10장 20 · 별빛이 끊긴 관측탑','스토리 10장 40 · 별빛이 끊긴 관측탑','스토리 10장 번외 3 · 별빛이 끊긴 관측탑')
    or p_boss_hp is distinct from 0 or p_correct is null or p_correct<0 or p_correct>10000
    or p_duration_ms is null or p_duration_ms<=0 or p_duration_ms>1440000 then
    raise exception 'invalid boss result';
  end if;
  select p.crystal_balance into v_balance from public.profiles p
    where p.user_id=v_owner for update;
  if not found then raise exception 'account wallet unavailable'; end if;
  if not exists(select 1 from public.profiles p where p.user_id=v_owner and p.role='admin')
    and not exists(select 1 from public.game_scores s join public.game_characters c on c.id=s.character_id
      where c.owner_user_id=v_owner and s.cleared and s.stage=case p_stage when '스토리 10장 20 · 별빛이 끊긴 관측탑' then '스토리 10장 19 · 별빛이 끊긴 관측탑' when '스토리 10장 40 · 별빛이 끊긴 관측탑' then '스토리 10장 39 · 별빛이 끊긴 관측탑' when '스토리 10장 번외 3 · 별빛이 끊긴 관측탑' then '스토리 10장 번외 2 · 별빛이 끊긴 관측탑' end) then
    raise exception 'previous stage clear required';
  end if;
  -- Include paid clears from before the dedicated boss RPC was introduced.
  -- Test receipt existence directly, even if its score reference was removed.
  v_reward:=case when exists(
    select 1 from public.coin_ledger l
    join public.game_characters c on c.id=l.character_id
    where c.owner_user_id=v_owner and l.reason='world_ten_reward' and l.stage=v_stage
  ) or exists(
    select 1 from public.game_scores s
    join public.game_characters c on c.id=s.character_id
    where c.owner_user_id=v_owner and s.stage=v_stage and s.cleared and s.coins_earned>0
  ) then 0 else 500 end;
  insert into public.game_scores(player,stage,correct,total,cleared,character_id,duration_ms,coins_earned,treasure_claimed)
    values(v_player,v_stage,p_correct,greatest(1,p_correct),true,p_character_id,p_duration_ms,v_reward,true)
    returning id into v_score;
  -- Consume both chest receipts: fixed rewards never grant additional loot.
  insert into public.story_item_rewards(game_score_id,character_id,item_id,potion_count)
    values(v_score,p_character_id,null,0);
  if v_reward>0 then
    update public.profiles set crystal_balance=crystal_balance+v_reward,updated_at=now()
      where user_id=v_owner returning crystal_balance into v_balance;
    insert into public.coin_ledger(character_id,amount,reason,stage,game_score_id)
      values(p_character_id,v_reward,'world_ten_reward',v_stage,v_score);
  end if;
  return query select v_score,v_reward,v_balance;
end $function$;
revoke all on function public.claim_world_ten_reward(uuid,text,integer,integer,integer) from public,anon;
grant execute on function public.claim_world_ten_reward(uuid,text,integer,integer,integer) to authenticated;
