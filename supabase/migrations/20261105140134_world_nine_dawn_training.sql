-- Extend the existing weighted, atomic roulette RPC without changing World 8.
do $migration$
declare definition text;
begin
  select pg_get_functiondef('public.claim_story_roulette_reward(uuid,uuid,text,integer,integer,integer,integer,integer)'::regprocedure) into definition;
  if position('^스토리 8장 ([1-9]|[12][0-9]) · 잿빛 종이 울리는 마을$' in definition)=0 then
    raise exception 'unexpected roulette reward definition';
  end if;
  definition:=replace(definition,
    'or p_stage !~ ''^스토리 8장 ([1-9]|[12][0-9]) · 잿빛 종이 울리는 마을$''',
    'or (p_stage !~ ''^스토리 8장 ([1-9]|[12][0-9]) · 잿빛 종이 울리는 마을$'' and p_stage !~ ''^스토리 9장 ([1-9]|[12][0-9]) · 새벽의 수련원$'')');
  definition:=replace(definition,'''^스토리 8장 ([0-9]+) ''','''^스토리 [89]장 ([0-9]+) ''');
  definition:=replace(definition,
    's.stage=''스토리 8장 ''||(v_stage_number-1)::text||'' · 잿빛 종이 울리는 마을''',
    's.stage=case when p_stage like ''스토리 9장 %'' then ''스토리 9장 ''||(v_stage_number-1)::text||'' · 새벽의 수련원'' else ''스토리 8장 ''||(v_stage_number-1)::text||'' · 잿빛 종이 울리는 마을'' end');
  definition:=replace(definition,
    's.stage in
        (''스토리 7A장 30 · 심연의 불타는 고대 탑'',''스토리 7B장 30 · 심연의 검은 호수'',''스토리 7C장 30 · 왕국 지하 던전'')',
    '((p_stage like ''스토리 9장 %'' and s.stage=''스토리 8장 30 · 잿빛 종이 울리는 마을'') or (p_stage like ''스토리 8장 %'' and s.stage in (''스토리 7A장 30 · 심연의 불타는 고대 탑'',''스토리 7B장 30 · 심연의 검은 호수'',''스토리 7C장 30 · 왕국 지하 던전'')))');
  -- Stored definitions can retain CRLF; normalize before checking the replacement.
  if position('p_stage like ''스토리 9장 %'' and s.stage=''스토리 8장 30' in definition)=0 then
    definition:=replace(definition,E'\r\n',E'\n');
    definition:=replace(definition,
      's.stage in
        (''스토리 7A장 30 · 심연의 불타는 고대 탑'',''스토리 7B장 30 · 심연의 검은 호수'',''스토리 7C장 30 · 왕국 지하 던전'')',
      '((p_stage like ''스토리 9장 %'' and s.stage=''스토리 8장 30 · 잿빛 종이 울리는 마을'') or (p_stage like ''스토리 8장 %'' and s.stage in (''스토리 7A장 30 · 심연의 불타는 고대 탑'',''스토리 7B장 30 · 심연의 검은 호수'',''스토리 7C장 30 · 왕국 지하 던전'')))');
  end if;
  if position('p_stage like ''스토리 9장 %'' and s.stage=''스토리 8장 30' in definition)=0 then raise exception 'world prerequisite replacement failed'; end if;
  execute definition;
end $migration$;

create or replace function private.story_clear_position(p_stage text)
returns table(stage_value bigint,label text)
language sql immutable set search_path='' as $function$
  with parsed as (
    select regexp_match(p_stage,'^스토리 (?:([1-9])([ABC])?장 )?([0-9]{1,2}|LV\.1) · ') as parts
  ), stage as (
    select coalesce(parts[1]::integer,1) as world,
      coalesce(parts[2],case when parts[1]='6' then 'B' else '' end) as branch,
      case when parts[3]='LV.1' then 2 else parts[3]::integer end as number
    from parsed where parts is not null
  )
  select (world*1000+number)::bigint,concat(world,branch,'-',number)
  from stage where number between 1 and case world
    when 1 then 7 when 2 then 7 when 3 then 8 when 4 then 20
    when 5 then 20 when 6 then 20 when 7 then 30 when 8 then 30 when 9 then 30 else 0 end
    and ((world=6 and branch in ('A','B')) or (world=7 and branch in ('A','B','C')) or (world not in (6,7) and branch=''));
$function$;
revoke all on function private.story_clear_position(text) from public,anon,authenticated;

-- These encounters use ordinary Story rewards, with no additional skill unlock.
create function public.claim_world_nine_boss_result(
  p_character_id uuid,p_stage_number integer,p_correct integer,p_duration_ms integer,
  p_boss_hp integer,p_slash_bonus integer default 0
)
returns table(game_score_id bigint,coins_earned integer,balance integer,personal_best boolean,stage_record boolean)
language plpgsql security definer set search_path='' as $function$
declare v_owner uuid;v_class text;v_hp integer;v_stage text;
begin
  select c.owner_user_id,c.class into v_owner,v_class from public.game_characters c where c.id=p_character_id for update;
  if not found or v_owner is null or auth.uid() is distinct from v_owner then raise exception 'character not found'; end if;
  v_hp:=case p_stage_number when 15 then 200 when 30 then 220 else 0 end;
  if v_hp=0 or p_correct is null or p_correct<0 or p_correct>v_hp or p_boss_hp is distinct from 0
    or p_duration_ms is null or p_duration_ms<1 or p_duration_ms>v_hp*(case when v_class='warrior' then 11000 else 6000 end)
    or p_slash_bonus is null or p_slash_bonus<0 then raise exception 'invalid training boss clear'; end if;
  if not exists(select 1 from public.profiles p where p.user_id=v_owner and p.role='admin')
    and not exists(select 1 from public.game_scores s join public.game_characters c on c.id=s.character_id
      where c.owner_user_id=v_owner and s.cleared and s.stage='스토리 9장 '||(p_stage_number-1)::text||' · 새벽의 수련원') then
    raise exception 'previous stage clear required';
  end if;
  v_stage:='스토리 9장 '||p_stage_number::text||' · 새벽의 수련원';
  return query select * from public.award_game_result(p_character_id,v_stage,p_correct,greatest(1,p_correct),true,p_duration_ms,p_slash_bonus);
end $function$;
revoke all on function public.claim_world_nine_boss_result(uuid,integer,integer,integer,integer,integer) from public,anon;
grant execute on function public.claim_world_nine_boss_result(uuid,integer,integer,integer,integer,integer) to authenticated;
