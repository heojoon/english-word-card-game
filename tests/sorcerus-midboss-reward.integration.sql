-- Linked production verification. Every wallet, potion and score change rolls back.
begin;
do $test$
declare
  c record; other_id uuid; r record; initial_balance integer; initial_potions integer;
  score_id bigint; damage integer; blocked boolean;
begin
  select gc.id,gc.owner_user_id into c from public.game_characters gc
    join public.profiles p on p.user_id=gc.owner_user_id where p.role='admin' order by gc.created_at limit 1;
  if not found then raise exception 'No admin character available'; end if;
  perform set_config('request.jwt.claim.sub',c.owner_user_id::text,true);
  perform set_config('request.jwt.claim.role','authenticated',true);
  if has_function_privilege('anon','public.claim_sorcerus_midboss_reward(uuid,integer,integer)','execute') then
    raise exception 'Anonymous reward access';
  end if;
  foreach damage in array array[119,241] loop
    blocked:=false;
    begin perform public.claim_sorcerus_midboss_reward(c.id,damage,1000); exception when others then blocked:=true; end;
    if not blocked then raise exception 'Invalid damage accepted'; end if;
  end loop;
  blocked:=false;
  begin perform public.claim_sorcerus_midboss_reward(c.id,120,360001); exception when others then blocked:=true; end;
  if not blocked then raise exception 'Invalid duration accepted'; end if;
  perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
  blocked:=false;
  begin perform public.claim_sorcerus_midboss_reward(c.id,120,1000); exception when others then blocked:=true; end;
  if not blocked then raise exception 'Foreign character accepted'; end if;
  perform set_config('request.jwt.claim.sub',c.owner_user_id::text,true);
  foreach damage in array array[120,135,240] loop
    delete from public.coin_ledger l using public.game_characters gc
      where l.character_id=gc.id and gc.owner_user_id=c.owner_user_id and l.reason='sorcerus_midboss_reward';
    select crystal_balance into initial_balance from public.profiles where user_id=c.owner_user_id;
    select red_potion_count into initial_potions from public.get_story_potion_inventory(c.id);
    select * into r from public.claim_sorcerus_midboss_reward(c.id,damage,360000);
    score_id:=r.game_score_id;
    if r.reward<>500 or r.balance<>initial_balance+500 or r.healing_potions<>5
      or (r.inventory->>'red_potion_count')::integer<>initial_potions+5 then raise exception 'Reward mismatch'; end if;
    if not exists(select 1 from public.game_scores where id=score_id and character_id=c.id
      and stage='스토리 5장 10 · 보랏빛 수정동굴' and cleared and treasure_claimed and coins_earned=500) then
      raise exception 'Progression or chest guard missing';
    end if;
    select * into r from public.claim_sorcerus_midboss_reward(c.id,damage,1000);
    if r.game_score_id<>score_id or r.reward<>0 or r.balance<>initial_balance+500 or r.healing_potions<>0
      or (r.inventory->>'red_potion_count')::integer<>initial_potions+5 then raise exception 'Duplicate reward'; end if;
    select id into other_id from public.game_characters where owner_user_id=c.owner_user_id and id<>c.id limit 1;
    if found then
      select red_potion_count into initial_potions from public.get_story_potion_inventory(other_id);
      select * into r from public.claim_sorcerus_midboss_reward(other_id,damage,1000);
      if r.reward<>0 or r.healing_potions<>0 or (r.inventory->>'red_potion_count')::integer<>initial_potions then
        raise exception 'Cross-character duplicate reward';
      end if;
    end if;
  end loop;
end;
$test$;
rollback;
