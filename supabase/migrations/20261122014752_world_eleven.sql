-- World 11 shares account Story progression across learning levels.
-- Ordinary stages/practice use the existing score API; bosses use HP-zero claims.
create function private.validate_world_eleven_score(
  p_character_id uuid,p_stage text,p_correct integer,p_total integer,
  p_cleared boolean,p_duration_ms integer,p_boss_claim boolean default false
)
returns void language plpgsql security definer set search_path='' as $function$
declare v_owner uuid;v_number integer;v_previous text;
begin
  if p_stage not like '스토리 11장 %' then return; end if;
  if p_stage !~ '^스토리 11장 ([1-9]|[1-3][0-9]|4[0-4]) · 낙성 요새의 마지막 수송$' then
    raise exception 'invalid world eleven stage';
  end if;
  select c.owner_user_id into v_owner from public.game_characters c where c.id=p_character_id;
  if not found or v_owner is null or auth.uid() is distinct from v_owner then
    raise exception 'character not found';
  end if;
  v_number:=substring(p_stage from '^스토리 11장 ([0-9]+) ')::integer;
  v_previous:=case when v_number=1 then '스토리 10장 40 · 별빛이 끊긴 관측탑'
    else '스토리 11장 '||(v_number-1)::text||' · 낙성 요새의 마지막 수송' end;
  -- Retain existing Admin playtest access; other accounts require actual prior clear.
  if not exists(select 1 from public.profiles p where p.user_id=v_owner and p.role='admin')
    and not exists(select 1 from public.game_scores s join public.game_characters c on c.id=s.character_id
      where c.owner_user_id=v_owner and s.cleared and s.stage=v_previous) then
    raise exception 'previous stage clear required';
  end if;
  if p_correct is null or p_correct<0 or p_total is null or p_total<1 or p_correct>p_total
    or p_cleared is null or p_duration_ms is null or p_duration_ms<0 then
    raise exception 'invalid world eleven score';
  end if;
  if v_number in (22,44) then
    if p_correct>10000 or p_total>10000 or p_duration_ms>2640000 then
      raise exception 'invalid world eleven boss score';
    end if;
    if p_cleared and not p_boss_claim then
      raise exception 'world eleven bosses require dedicated claim';
    end if;
  elsif p_total<>30 or (p_cleared and p_correct<>30) or p_duration_ms>330000 then
    raise exception 'invalid world eleven ordinary score';
  end if;
end $function$;
revoke all on function private.validate_world_eleven_score(uuid,text,integer,integer,boolean,integer,boolean) from public,anon,authenticated;

-- Keep every existing overload and every previous world's behavior intact.
-- All slash/fever overloads eventually call this six-argument base function.
do $migration$
declare definition text;needle text:='  v_question:=p_correct;';
begin
  select pg_get_functiondef('public.award_game_result(uuid,text,integer,integer,boolean,integer)'::regprocedure) into definition;
  if position(needle in definition)=0 then raise exception 'unexpected base reward definition'; end if;
  definition:=replace(definition,needle,
    '  perform private.validate_world_eleven_score(p_character_id,p_stage,p_correct,p_total,p_cleared,p_duration_ms);'||E'\n'||needle);
  execute definition;
end $migration$;

-- Existing ordinary Warrior slash is retained; this world's bosses have no
-- slash payout, and neither ordinary nor boss encounters introduce a fever.
do $migration$
declare definition text;needle text;
begin
  select pg_get_functiondef('public.award_game_result(uuid,text,integer,integer,boolean,integer,integer)'::regprocedure) into definition;
  needle:='  if p_slash_bonus is null';
  if position(needle in definition)=0 then raise exception 'unexpected slash reward definition'; end if;
  definition:=replace(definition,needle,
    '  if p_stage in (''스토리 11장 22 · 낙성 요새의 마지막 수송'',''스토리 11장 44 · 낙성 요새의 마지막 수송'') and p_slash_bonus>0 then raise exception ''world eleven boss has no slash payout''; end if;'||E'\n'||needle);
  execute definition;
  select pg_get_functiondef('public.award_game_result(uuid,text,integer,integer,boolean,integer,integer,integer)'::regprocedure) into definition;
  needle:='  if p_fever_bonus is null';
  if position(needle in definition)=0 then raise exception 'unexpected fever reward definition'; end if;
  definition:=replace(definition,needle,
    '  if p_stage like ''스토리 11장 %'' and p_fever_bonus>0 then raise exception ''world eleven has no fever payout''; end if;'||E'\n'||needle);
  execute definition;
end $migration$;

-- The no-reward legacy API must not bypass boss HP validation/progression either.
do $migration$
declare definition text;needle text:='  if p_cleared then';
begin
  select pg_get_functiondef('public.record_game_result_without_reward(uuid,text,integer,integer,boolean,integer)'::regprocedure) into definition;
  if position(needle in definition)=0 then raise exception 'unexpected record-only definition'; end if;
  definition:=replace(definition,needle,
    '  perform private.validate_world_eleven_score(p_character_id,p_stage,p_correct,p_total,p_cleared,p_duration_ms);'||E'\n'||needle);
  execute definition;
end $migration$;

-- Also protect legacy direct anonymous inserts: they cannot forge account progress.
create function private.guard_world_eleven_direct_score()
returns trigger language plpgsql security definer set search_path='' as $function$
begin
  if new.stage like '스토리 11장 %' then
    perform private.validate_world_eleven_score(new.character_id,new.stage,new.correct,new.total,new.cleared,new.duration_ms,true);
  end if;
  return new;
end $function$;
revoke all on function private.guard_world_eleven_direct_score() from public,anon,authenticated;
create trigger guard_world_eleven_direct_score before insert or update of stage,character_id,correct,total,cleared,duration_ms
  on public.game_scores for each row execute function private.guard_world_eleven_direct_score();

create function public.claim_world_eleven_boss_result(
  p_character_id uuid,p_stage text,p_correct integer,p_duration_ms integer,p_boss_hp integer
)
returns table(game_score_id bigint,coins_earned integer,balance integer,personal_best boolean,stage_record boolean)
language plpgsql security definer set search_path='' as $function$
declare
  v_owner uuid;v_player text;v_class text;v_score bigint;v_balance integer;
  v_question integer;v_combo integer;v_clear integer;v_reward integer;v_story_replay boolean;
  v_personal boolean;v_record boolean;
begin
  select c.owner_user_id,c.player,c.class into v_owner,v_player,v_class
    from public.game_characters c where c.id=p_character_id for update;
  if not found or v_owner is null or auth.uid() is distinct from v_owner then raise exception 'character not found'; end if;
  if p_stage is null or p_stage not in ('스토리 11장 22 · 낙성 요새의 마지막 수송','스토리 11장 44 · 낙성 요새의 마지막 수송')
    or p_boss_hp is distinct from 0 or p_correct is null or p_correct<0 or p_correct>10000
    or p_duration_ms is null or p_duration_ms<1 or p_duration_ms>2640000 then
    raise exception 'invalid world eleven boss clear';
  end if;
  -- Serializes all characters on this account before checking first-clear reward.
  select p.crystal_balance into v_balance from public.profiles p where p.user_id=v_owner for update;
  if not found then raise exception 'account wallet unavailable'; end if;
  perform private.validate_world_eleven_score(p_character_id,p_stage,p_correct,greatest(1,p_correct),true,p_duration_ms,true);
  select exists(select 1 from public.game_scores s join public.game_characters c on c.id=s.character_id
    where c.owner_user_id=v_owner and s.stage=p_stage and s.cleared) into v_story_replay;
  v_question:=p_correct;
  v_combo:=floor(p_correct / case when v_class='pugilist' then 3.0 else 5.0 end)::integer;
  v_clear:=10;
  v_reward:=case when v_story_replay then 0 else v_question+v_combo+v_clear end;
  select coalesce(p_duration_ms<min(s.duration_ms),true) into v_personal
    from public.game_scores s where s.character_id=p_character_id and s.stage=p_stage and s.cleared;
  select coalesce(p_duration_ms<min(s.duration_ms),true) into v_record
    from public.game_scores s where s.stage=p_stage and s.cleared;
  -- Zero actual answers are valid when existing damage skills finish the boss.
  insert into public.game_scores(player,stage,correct,total,cleared,character_id,duration_ms,coins_earned)
    values(v_player,p_stage,p_correct,greatest(1,p_correct),true,p_character_id,p_duration_ms,v_reward)
    returning id into v_score;
  update public.profiles set crystal_balance=crystal_balance+v_reward,updated_at=now()
    where user_id=v_owner returning crystal_balance into v_balance;
  if not v_story_replay then
    if v_question>0 then insert into public.coin_ledger(character_id,amount,reason,stage,game_score_id)
      values(p_character_id,v_question,'question_reward',p_stage,v_score); end if;
    if v_combo>0 then insert into public.coin_ledger(character_id,amount,reason,stage,game_score_id)
      values(p_character_id,v_combo,'combo_bonus',p_stage,v_score); end if;
    insert into public.coin_ledger(character_id,amount,reason,stage,game_score_id)
      values(p_character_id,v_clear,'stage_clear_bonus',p_stage,v_score);
  end if;
  -- Standard Story treasure/item claims remain available; no new fixed loot.
  return query select v_score,v_reward,v_balance,v_personal,v_record;
end $function$;
revoke all on function public.claim_world_eleven_boss_result(uuid,text,integer,integer,integer) from public,anon;
grant execute on function public.claim_world_eleven_boss_result(uuid,text,integer,integer,integer) to authenticated;

-- Include the new world in existing hall-of-fame progress calculations.
-- Fix the pre-existing one-digit parser so World 10 remains correctly ordered.
create or replace function private.story_clear_position(p_stage text)
returns table(stage_value bigint,label text)
language sql immutable set search_path='' as $function$
  with parsed as (
    select regexp_match(p_stage,'^스토리 (?:([1-9]|10|11)([ABC])?장 )?([0-9]{1,2}|LV\.1) · ') as parts
  ), stage as (
    select coalesce(parts[1]::integer,1) as world,
      coalesce(parts[2],case when parts[1]='6' then 'B' else '' end) as branch,
      case when parts[3]='LV.1' then 2 else parts[3]::integer end as number
    from parsed where parts is not null
  )
  select (world*1000+number)::bigint,concat(world,branch,'-',number)
  from stage where number between 1 and case world
    when 1 then 7 when 2 then 7 when 3 then 8 when 4 then 20
    when 5 then 20 when 6 then 20 when 7 then 30 when 8 then 30 when 9 then 30
    when 10 then 40 when 11 then 44 else 0 end
    and ((world=6 and branch in ('A','B')) or (world=7 and branch in ('A','B','C')) or (world not in (6,7) and branch=''));
$function$;
revoke all on function private.story_clear_position(text) from public,anon,authenticated;
