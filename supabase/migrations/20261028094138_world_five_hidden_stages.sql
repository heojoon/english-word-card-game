-- Hidden stages use separate records so repeatable rewards never alter Story progress.
create table public.world_five_hidden_unlocks (
  character_id uuid primary key references public.game_characters(id) on delete cascade,
  unlocked_at timestamptz not null default now()
);
create table public.world_five_hidden_runs (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.game_characters(id) on delete cascade,
  kind text not null check (kind in ('fever','king')),
  started_at timestamptz not null default now(),
  abandoned boolean not null default false,
  game_score_id bigint unique references public.game_scores(id),
  pet_granted boolean not null default false
);
create index world_five_hidden_runs_character_idx on public.world_five_hidden_runs(character_id);
create unique index world_five_hidden_one_active on public.world_five_hidden_runs(character_id) where game_score_id is null and not abandoned;
alter table public.world_five_hidden_unlocks enable row level security;
alter table public.world_five_hidden_runs enable row level security;
revoke all on public.world_five_hidden_unlocks,public.world_five_hidden_runs from anon,authenticated;
grant select on public.world_five_hidden_unlocks,public.world_five_hidden_runs to authenticated;
create policy hidden_unlock_owner on public.world_five_hidden_unlocks for select to authenticated
  using (exists(select 1 from public.game_characters c where c.id=character_id and c.owner_user_id=(select auth.uid())));
create policy hidden_run_owner on public.world_five_hidden_runs for select to authenticated
  using (exists(select 1 from public.game_characters c where c.id=character_id and c.owner_user_id=(select auth.uid())));

create function public.world_five_hidden_access(p_character_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare v_owner uuid;
begin
  select c.owner_user_id into v_owner from public.game_characters c where c.id=p_character_id;
  if not found or (v_owner is not null and auth.uid() is distinct from v_owner)
    or (v_owner is null and auth.uid() is not null) then raise exception 'character not found'; end if;
  return exists(select 1 from public.world_five_hidden_unlocks u join public.game_characters c on c.id=u.character_id
    where (v_owner is not null and c.owner_user_id=v_owner) or (v_owner is null and c.id=p_character_id));
end $$;

create function public.begin_world_five_hidden(p_character_id uuid,p_kind text) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
  -- The access function also verifies character ownership for guests and accounts.
  if not public.world_five_hidden_access(p_character_id) then raise exception 'hidden stage locked'; end if;
  if p_kind is null or p_kind not in ('fever','king') then raise exception 'invalid hidden stage'; end if;
  perform 1 from public.game_characters c where c.id=p_character_id for update;
  update public.world_five_hidden_runs set abandoned=true where character_id=p_character_id and game_score_id is null and not abandoned;
  insert into public.world_five_hidden_runs(character_id,kind) values(p_character_id,p_kind) returning id into v_id;
  return v_id;
end $$;

create function public.finish_world_five_hidden(p_session_id uuid,p_counts integer[],p_damage integer,p_duration_ms integer,p_completed boolean)
returns table(game_score_id bigint,coins_earned integer,balance integer,pet_granted boolean)
language plpgsql security definer set search_path='' as $$
declare
  v_run public.world_five_hidden_runs%rowtype; v_owner uuid; v_player text;
  v_reward integer:=0; v_balance integer; v_score bigint; v_pet bigint; v_granted boolean:=false;
  v_count integer; v_round integer:=0; v_rounds integer; v_wall_ms numeric;
begin
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
    v_reward:=case when p_completed then floor(p_damage*1.5)::integer else 0 end;
    if p_completed and p_damage>=500 then
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

revoke all on function public.world_five_hidden_access(uuid) from public;
revoke all on function public.begin_world_five_hidden(uuid,text) from public;
revoke all on function public.finish_world_five_hidden(uuid,integer[],integer,integer,boolean) from public;
grant execute on function public.world_five_hidden_access(uuid),public.begin_world_five_hidden(uuid,text),public.finish_world_five_hidden(uuid,integer[],integer,integer,boolean) to anon,authenticated;

create or replace function public.award_game_result(
  p_character_id uuid, p_stage text, p_correct integer, p_total integer,
  p_cleared boolean, p_duration_ms integer, p_slash_bonus integer,
  p_fever_bonus integer
)
returns table(game_score_id bigint, coins_earned integer, balance integer, personal_best boolean, stage_record boolean)
language plpgsql security definer set search_path = '' as $function$
declare
  v_base record;
  v_owner uuid;
  v_balance integer;
begin
  if p_fever_bonus is null or p_fever_bonus < 0 then
    raise exception 'invalid fever bonus';
  end if;
  -- Fever starts only after every Story question is answered. Crystals spawn
  -- at most once per 550ms within the total * 3000ms game-time budget.
  if p_fever_bonus > 0 then
    if p_stage is null or p_stage not like '스토리 %'
      or p_total is null or p_total <= 0 or p_correct is distinct from p_total then
      raise exception 'fever bonus requires completed story questions';
    end if;
    if p_fever_bonus::numeric > ceil(p_total::numeric * 3000 / 550) then
      raise exception 'fever bonus exceeds spawn limit';
    end if;
  end if;

  select * into v_base from public.award_game_result(
    p_character_id, p_stage, p_correct, p_total, p_cleared, p_duration_ms, p_slash_bonus
  );
  -- Replay fever is still submitted as unlock evidence, but never paid here.
  if p_stage='스토리 5장 7 · 보랏빛 수정동굴' and p_cleared and p_fever_bonus>=100 then
    select c.owner_user_id into v_owner from public.game_characters c where c.id=p_character_id;
    if exists(select 1 from public.game_scores s join public.game_characters c on c.id=s.character_id
        where s.stage in (p_stage,p_stage||' · 초등학생') and s.cleared and s.id<>v_base.game_score_id
        and ((v_owner is not null and c.owner_user_id=v_owner) or (v_owner is null and c.id=p_character_id)))
      and exists(select 1 from public.game_scores s join public.game_characters c on c.id=s.character_id
        where s.stage in ('스토리 5장 20 · 보랏빛 수정동굴','스토리 5장 20 · 보랏빛 수정동굴 · 초등학생') and s.cleared
        and ((v_owner is not null and c.owner_user_id=v_owner) or (v_owner is null and c.id=p_character_id))) then
      insert into public.world_five_hidden_unlocks(character_id) values(p_character_id) on conflict do nothing;
    end if;
  end if;
  -- A previously cleared Story stage pays neither base nor fever rewards.
  if p_fever_bonus = 0 or v_base.coins_earned = 0 then
    return query select v_base.game_score_id, v_base.coins_earned, v_base.balance, v_base.personal_best, v_base.stage_record;
    return;
  end if;

  select c.owner_user_id into v_owner from public.game_characters c
    where c.id = p_character_id for update;
  if v_owner is not null then
    update public.profiles set crystal_balance = crystal_balance + p_fever_bonus, updated_at = now()
      where user_id = v_owner returning crystal_balance into v_balance;
  else
    update public.game_characters set coins = coins + p_fever_bonus
      where id = p_character_id returning coins into v_balance;
  end if;
  update public.game_scores as s set coins_earned = s.coins_earned + p_fever_bonus
    where id = v_base.game_score_id and character_id = p_character_id;
  insert into public.coin_ledger(character_id, amount, reason, stage, game_score_id)
    values(p_character_id, p_fever_bonus, 'fever_bonus', p_stage, v_base.game_score_id);

  return query select v_base.game_score_id, v_base.coins_earned + p_fever_bonus, v_balance, v_base.personal_best, v_base.stage_record;
end;
$function$;

revoke all on function public.award_game_result(uuid,text,integer,integer,boolean,integer,integer,integer) from public;
grant execute on function public.award_game_result(uuid,text,integer,integer,boolean,integer,integer,integer) to anon, authenticated;
