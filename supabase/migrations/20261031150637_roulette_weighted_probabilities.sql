-- Keep receipt indices 0..4 stable and append x1.5 as index 5.
-- The user changed the distribution to blank 5%, x0.5 10%, x1 30%,
-- x1.5 25%, x2 20%, x3 10%.
create function private.story_roulette_index(p_roll integer)
returns smallint language sql immutable strict set search_path='' as $function$
  select case
    when p_roll between 0 and 29 then 0
    when p_roll between 30 and 49 then 1
    when p_roll between 50 and 59 then 2
    when p_roll between 60 and 69 then 3
    when p_roll between 70 and 74 then 4
    when p_roll between 75 and 99 then 5
    else null
  end::smallint;
$function$;
revoke all on function private.story_roulette_index(integer) from public,anon,authenticated;

alter table public.story_roulette_receipts drop constraint story_roulette_receipts_spin_index_check;
alter table public.story_roulette_receipts add constraint story_roulette_receipts_spin_index_check check (spin_index between 0 and 5);

-- Preserve the existing ownership, progression, wallet locks, idempotency,
-- passive-clock validation and atomic payout while replacing only sampling.
do $migration$
declare definition text;
begin
  select pg_get_functiondef('public.claim_story_roulette_reward(uuid,uuid,text,integer,integer,integer,integer,integer)'::regprocedure) into definition;
  if position('v_index:=floor(random()*5)::integer;' in definition)=0
    or position('array[1,2,3,0.5,0]::numeric[]' in definition)=0 then
    raise exception 'unexpected roulette reward definition';
  end if;
  definition:=replace(definition,'v_index:=floor(random()*5)::integer;',
    'v_index:=private.story_roulette_index(floor(random()*100)::integer);');
  definition:=replace(definition,'array[1,2,3,0.5,0]::numeric[]','array[1,2,3,0.5,0,1.5]::numeric[]');
  definition:=replace(definition,'-- Five equal intervals. Never accept a client-supplied multiplier or bonus.',
    '-- Weighted server selection. Never accept a client-supplied multiplier or bonus.');
  execute definition;
end $migration$;
comment on function public.claim_story_roulette_reward(uuid,uuid,text,integer,integer,integer,integer,integer) is
  'World 8 weighted roulette: x1 30%, x2 20%, x3 10%, x0.5 10%, blank 5%, x1.5 25%; idempotent atomic payout.';
