-- Match storyStageUnlocked(): administrators may enter the boss without stage 29.
-- Ordinary accounts still require stage 29; ownership and one-time rewards apply to all.
create or replace function public.claim_red_skull_knight_reward(
  p_character_id uuid, p_correct integer, p_duration_ms integer, p_boss_hp integer
)
returns table(game_score_id bigint, reward integer, balance integer)
language plpgsql security definer set search_path = '' as $function$
declare
  v_owner uuid; v_player text; v_score bigint; v_balance integer; v_reward integer;
  v_stage constant text := '스토리 7A장 30 · 심연의 불타는 고대 탑';
begin
  select c.owner_user_id,c.player into v_owner,v_player
    from public.game_characters c where c.id=p_character_id for update;
  if not found or v_owner is null or auth.uid() is distinct from v_owner then
    raise exception 'character not found';
  end if;
  if p_boss_hp is distinct from 0 or p_correct is null or p_correct<1 or p_correct>180
    or p_duration_ms is null or p_duration_ms<=0 or p_duration_ms>330000 then
    raise exception 'invalid boss result';
  end if;
  select p.crystal_balance into v_balance from public.profiles p
    where p.user_id=v_owner for update;
  if not found then raise exception 'account wallet unavailable'; end if;
  if not exists(select 1 from public.profiles p where p.user_id=v_owner and p.role='admin')
    and not exists(select 1 from public.game_scores s
    join public.game_characters c on c.id=s.character_id
    where c.owner_user_id=v_owner and s.stage='스토리 7A장 29 · 심연의 불타는 고대 탑' and s.cleared) then
    raise exception 'previous stage clear required';
  end if;
  select l.game_score_id into v_score from public.coin_ledger l
    join public.game_characters c on c.id=l.character_id
    where c.owner_user_id=v_owner and l.reason='red_skull_knight_reward'
    order by l.id limit 1;
  v_reward:=case when v_score is null then 700 else 0 end;
  insert into public.game_scores(player,stage,correct,total,cleared,character_id,duration_ms,coins_earned,treasure_claimed)
    values(v_player,v_stage,p_correct,p_correct,true,p_character_id,p_duration_ms,v_reward,true)
    returning id into v_score;
  if v_reward>0 then
    update public.profiles set crystal_balance=crystal_balance+v_reward,updated_at=now()
      where user_id=v_owner returning crystal_balance into v_balance;
    insert into public.coin_ledger(character_id,amount,reason,stage,game_score_id)
      values(p_character_id,v_reward,'red_skull_knight_reward',v_stage,v_score);
  end if;
  return query select v_score,v_reward,v_balance;
end $function$;
revoke all on function public.claim_red_skull_knight_reward(uuid,integer,integer,integer) from public,anon;
grant execute on function public.claim_red_skull_knight_reward(uuid,integer,integer,integer) to authenticated;
