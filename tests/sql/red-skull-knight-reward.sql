-- Run against the linked database. All test changes are rolled back.
-- Requires an ordinary account that cleared 7A-29 and has not claimed this boss.
begin;
create function pg_temp.test_red_skull_reward() returns text
language plpgsql as $$
declare
  v_character uuid; v_owner uuid; v_before integer; v_first record; v_repeat record;
begin
  select c.id,c.owner_user_id into v_character,v_owner
  from public.game_characters c join public.profiles p on p.user_id=c.owner_user_id
  where p.role <> 'admin'
    and exists(select 1 from public.game_scores s
      join public.game_characters h on h.id=s.character_id
      where h.owner_user_id=c.owner_user_id and s.cleared
        and s.stage='스토리 7A장 29 · 심연의 불타는 고대 탑')
    and not exists(select 1 from public.coin_ledger l
      join public.game_characters h on h.id=l.character_id
      where h.owner_user_id=c.owner_user_id and l.reason='red_skull_knight_reward')
  limit 1;
  if v_character is null then raise exception 'missing eligible non-admin test account'; end if;

  perform set_config('request.jwt.claim.sub',v_owner::text,true);
  select crystal_balance into v_before from public.profiles where user_id=v_owner for update;
  select * into strict v_first from public.claim_red_skull_knight_reward(v_character,60,120000,0);
  if v_first.reward <> 700 or v_first.balance <> v_before+700 then
    raise exception 'first clear must award exactly 700';
  end if;
  if not exists(select 1 from public.game_scores where id=v_first.game_score_id
    and cleared and coins_earned=700 and treasure_claimed) then
    raise exception 'clear record missing';
  end if;
  if not exists(select 1 from public.coin_ledger where game_score_id=v_first.game_score_id
    and reason='red_skull_knight_reward' and amount=700) then
    raise exception 'reward receipt missing';
  end if;
  select * into strict v_repeat from public.claim_red_skull_knight_reward(v_character,60,120000,0);
  if v_repeat.reward <> 0 or v_repeat.balance <> v_first.balance then
    raise exception 'retry must not award twice';
  end if;
  begin
    perform * from public.claim_red_skull_knight_reward(v_character,60,120000,1);
    raise exception 'uncleared boss was accepted';
  exception when raise_exception then
    if sqlerrm <> 'invalid boss result' then raise; end if;
  end;
  perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000000',true);
  begin
    perform * from public.claim_red_skull_knight_reward(v_character,60,120000,0);
    raise exception 'wrong owner was accepted';
  exception when raise_exception then
    if sqlerrm <> 'character not found' then raise; end if;
  end;
  return 'PASS: non-admin clear, 700 crystals, clear record, receipt, retry, boss HP and ownership';
end $$;
select pg_temp.test_red_skull_reward() as result;
rollback;
