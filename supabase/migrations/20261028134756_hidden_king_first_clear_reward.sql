-- King remains replayable; only the first completed run per account earns rewards.
-- Fever retains its existing one-entry policy. Historical clears count as rewarded.
create or replace function public.begin_world_five_hidden(p_character_id uuid,p_kind text) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_owner uuid;
begin
  if not public.world_five_hidden_access(p_character_id) then raise exception 'hidden stage locked'; end if;
  if p_kind is null or p_kind not in ('fever','king') then raise exception 'invalid hidden stage'; end if;
  select owner_user_id into v_owner from public.game_characters where id=p_character_id;
  -- Serialize entries across every character of the same account.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('world-five-hidden:'||coalesce(v_owner,p_character_id)::text,0));
  if p_kind='fever' and (public.world_five_hidden_status(p_character_id)->'used') ? p_kind then
    raise exception 'hidden stage already entered';
  end if;
  perform 1 from public.game_characters c where c.id=p_character_id for update;
  update public.world_five_hidden_runs set abandoned=true where character_id=p_character_id and game_score_id is null and not abandoned;
  insert into public.world_five_hidden_runs(character_id,kind) values(p_character_id,p_kind) returning id into v_id;
  return v_id;
end $$;

create or replace function public.finish_world_five_hidden(p_session_id uuid,p_counts integer[],p_damage integer,p_duration_ms integer,p_completed boolean)
returns table(game_score_id bigint,coins_earned integer,balance integer,pet_granted boolean)
language plpgsql security definer set search_path='' as $$
declare
  v_run public.world_five_hidden_runs%rowtype; v_owner uuid; v_player text;
  v_reward integer:=0; v_balance integer; v_score bigint; v_pet bigint; v_granted boolean:=false;
  v_first_clear boolean:=false; v_count integer; v_round integer:=0; v_rounds integer; v_wall_ms numeric;
begin
  select c.owner_user_id into v_owner from public.world_five_hidden_runs r
    join public.game_characters c on c.id=r.character_id where r.id=p_session_id;
  select * into v_run from public.world_five_hidden_runs where id=p_session_id;
  if not found then raise exception 'hidden run not found'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('world-five-hidden:'||coalesce(v_owner,v_run.character_id)::text,0));
  select * into v_run from public.world_five_hidden_runs where id=p_session_id for update;
  if not found then raise exception 'hidden run not found'; end if;
  if v_run.abandoned then raise exception 'hidden run abandoned'; end if;
  select c.owner_user_id,c.player into v_owner,v_player from public.game_characters c where c.id=v_run.character_id for update;
  if not found or (v_owner is not null and auth.uid() is distinct from v_owner)
    or (v_owner is null and auth.uid() is not null) then raise exception 'character not found'; end if;
  if v_owner is not null then
    select p.crystal_balance into v_balance from public.profiles p where p.user_id=v_owner for update;
  else select c.coins into v_balance from public.game_characters c where c.id=v_run.character_id; end if;
  if v_run.game_score_id is not null then
    return query select s.id,s.coins_earned,v_balance,v_run.pet_granted from public.game_scores s where s.id=v_run.game_score_id;return;
  end if;
  v_wall_ms:=extract(epoch from (clock_timestamp()-v_run.started_at))*1000;
  if p_completed is null or p_duration_ms is null or p_duration_ms<0 or p_duration_ms>300000
    or p_duration_ms>v_wall_ms+1000 or p_damage is null or p_damage<0 or p_damage>999 then raise exception 'invalid hidden result'; end if;
  if v_run.kind='fever' then
    v_rounds:=cardinality(p_counts);
    if p_counts is null or v_rounds<1 or v_rounds>5 or array_ndims(p_counts)<>1 or array_lower(p_counts,1)<>1 or p_damage<>0 then raise exception 'invalid fever rounds'; end if;
    foreach v_count in array p_counts loop
      v_round:=v_round+1;
      if v_count is null or v_count<0 or v_count>150 or
        (v_round<v_rounds and v_count<50+v_round*10) then raise exception 'invalid fever count'; end if;
      v_reward:=v_reward+v_count;
    end loop;
    if p_duration_ms<(v_rounds-1)*60000 or p_duration_ms>v_rounds*60000
      or p_counts[v_rounds]>least(150,1+floor(greatest(0,p_duration_ms-(v_rounds-1)*60000-1)/400.0))
      or (p_completed and (p_duration_ms<>v_rounds*60000 or (v_rounds<5 and p_counts[v_rounds]>=50+v_rounds*10)))
      then raise exception 'invalid fever duration'; end if;
  else
    if cardinality(p_counts) is distinct from 0 or (p_completed and p_duration_ms<>300000)
      or (p_duration_ms=0 and p_damage>0) then raise exception 'invalid king result'; end if;
    v_first_clear:=p_completed and not exists(
      select 1 from public.world_five_hidden_runs r
      join public.game_characters c on c.id=r.character_id
      join public.game_scores s on s.id=r.game_score_id
      where r.kind='king' and s.cleared
        and ((v_owner is not null and c.owner_user_id=v_owner)
          or (v_owner is null and c.id=v_run.character_id))
    );
    v_reward:=case when v_first_clear then floor(p_damage*1.5)::integer else 0 end;
    if v_first_clear and p_damage>=500 then
      select i.id into v_pet from public.shop_items i where i.code='pet_prism_guardian_dragon' and i.active;
      if v_pet is null then raise exception 'pet catalog unavailable'; end if;
      if not exists(select 1 from public.character_inventory ci where ci.character_id=v_run.character_id and ci.item_id=v_pet) then
        insert into public.character_inventory(character_id,item_id) values(v_run.character_id,v_pet);v_granted:=true;
      end if;
    end if;
  end if;
  insert into public.game_scores(player,stage,correct,total,cleared,character_id,duration_ms,coins_earned,treasure_claimed)
    values(v_player,'히든 5 · '||v_run.kind,case when v_run.kind='king' then p_damage else v_reward end,
      greatest(1,case when v_run.kind='king' then p_damage else v_reward end),p_completed,v_run.character_id,p_duration_ms,v_reward,true)
    returning id into v_score;
  if v_owner is not null then
    update public.profiles set crystal_balance=crystal_balance+v_reward,updated_at=now() where user_id=v_owner returning crystal_balance into v_balance;
  else
    update public.game_characters set coins=coins+v_reward where id=v_run.character_id returning coins into v_balance;
  end if;
  if v_reward>0 then insert into public.coin_ledger(character_id,amount,reason,stage,game_score_id)
    values(v_run.character_id,v_reward,'fever_bonus','히든 5 · '||v_run.kind,v_score);end if;
  update public.world_five_hidden_runs set game_score_id=v_score,pet_granted=v_granted where id=p_session_id;
  return query select v_score,v_reward,v_balance,v_granted;
end $$;
