-- Reuse the existing atomic crystal-collection reward, retaining ownership,
-- progression, spawn limits, wallet locks and account-wide first-clear checks.
do $migration$
declare
  definition text;
  needle text := 'if p_stage like ''스토리 11장 %'' and p_fever_bonus>0 then raise exception ''world eleven has no fever payout''; end if;';
begin
  select pg_get_functiondef('public.award_game_result(uuid,text,integer,integer,boolean,integer,integer,integer)'::regprocedure) into definition;
  if position(needle in definition)=0 then raise exception 'unexpected world eleven fever definition'; end if;
  definition := replace(definition, needle, $guard$
if p_stage like '스토리 11장 %' and p_fever_bonus>0 then
    if p_stage in ('스토리 11장 22 · 낙성 요새의 마지막 수송','스토리 11장 44 · 낙성 요새의 마지막 수송') then
      raise exception 'world eleven boss has no fever payout';
    end if;
    if p_cleared is distinct from true then
      raise exception 'world eleven fever requires clear';
    end if;
  end if;
$guard$);
  execute definition;
end $migration$;
