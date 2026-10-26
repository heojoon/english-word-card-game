-- Accept 90-second trials and preserve in-flight legacy trial results.
-- World 6B-20 keeps its existing stage identifier across both learning levels.
create or replace function public.claim_elliot_reward(
  p_character_id uuid, p_correct integer, p_duration_ms integer,
  p_cleared boolean, p_boss_hp integer, p_player_hp integer
)
returns table(game_score_id bigint, reward integer, balance integer)
language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid; v_player text; v_score bigint; v_balance integer; v_admin boolean;
  v_stage constant text := '스토리 6장 20 · 왕국수도로 가는 길';
begin
  select c.owner_user_id,c.player into v_owner,v_player from public.game_characters c
    where c.id=p_character_id for update;
  if not found or v_owner is null or auth.uid() is distinct from v_owner then
    raise exception 'character not found';
  end if;
  if p_cleared is null or p_correct is null or p_correct<0 or p_correct>2000
    or p_duration_ms is null or p_duration_ms<=0 or p_duration_ms>300000
    or p_boss_hp is null or p_boss_hp<0 or p_boss_hp>500
    or p_player_hp is null or p_player_hp<0 or p_player_hp>100
    or (p_cleared and (p_duration_ms not in (90000,210000,240000,300000) or p_player_hp<=0)) then
    raise exception 'invalid Elliot trial result';
  end if;
  select p.crystal_balance,p.role='admin' into v_balance,v_admin from public.profiles p
    where p.user_id=v_owner for update;
  if not found then raise exception 'account wallet unavailable'; end if;
  if not v_admin then
    if not exists(select 1 from public.story_branch_choices where user_id=v_owner and branch='6B') then
      raise exception 'story branch access denied';
    end if;
    if not exists(select 1 from public.game_scores s join public.game_characters c on c.id=s.character_id
      where c.owner_user_id=v_owner and s.stage='스토리 6장 19 · 왕국수도로 가는 길' and s.cleared) then
      raise exception 'previous stage clear required';
    end if;
  end if;
  if p_cleared then
    select l.game_score_id into v_score from public.coin_ledger l
      join public.game_characters c on c.id=l.character_id
      where c.owner_user_id=v_owner and l.reason='elliot_final_boss_reward'
      order by l.id limit 1;
    if found then
      update public.game_scores set cleared=true where id=v_score and not cleared;
      return query select v_score,0,v_balance;
      return;
    end if;
  end if;
  insert into public.game_scores(player,stage,correct,total,cleared,character_id,duration_ms,coins_earned,treasure_claimed)
    values(v_player,v_stage,p_correct,case when p_cleared then p_correct else greatest(500,p_correct+1) end,
      p_cleared,p_character_id,p_duration_ms,case when p_cleared then 800 else 0 end,true)
    returning id into v_score;
  if p_cleared then
    update public.profiles set crystal_balance=crystal_balance+800,updated_at=now()
      where user_id=v_owner returning crystal_balance into v_balance;
    insert into public.coin_ledger(character_id,amount,reason,stage,game_score_id)
      values(p_character_id,800,'elliot_final_boss_reward',v_stage,v_score);
  end if;
  return query select v_score,case when p_cleared then 800 else 0 end,v_balance;
end $$;
revoke all on function public.claim_elliot_reward(uuid,integer,integer,boolean,integer,integer) from public,anon;
grant execute on function public.claim_elliot_reward(uuid,integer,integer,boolean,integer,integer) to authenticated;

-- Fail closed for older ordinary-question reward paths (no extra chests or combos).
create or replace function public.enforce_elliot_reward() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.stage='스토리 6장 20 · 왕국수도로 가는 길' then
    if new.cleared and (new.coins_earned<>800 or new.treasure_claimed is not true or new.duration_ms not in (90000,210000,240000,300000)) then
      raise exception 'use Elliot trial reward';
    elsif not new.cleared and new.coins_earned<>0 then
      raise exception 'Elliot failure has no reward';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.enforce_elliot_reward() from public,anon,authenticated;
