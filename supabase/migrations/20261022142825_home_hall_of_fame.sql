-- Public achievement summaries only. Raw scores, account IDs, and private map
-- names remain protected by their existing RLS policies.
create function private.hall_of_fame()
returns table(category text, rank integer, player_name text, character_name text, value bigint)
language sql stable security definer set search_path = ''
as $$
  with thresholds as (
    select level, sum(100 + (level / 10) * 20) over (order by level) as required
    from generate_series(1, 99) as levels(level)
  ), achievements as (
    select c.id, c.created_at, p.login_id as player_name, c.name as character_name,
      coalesce(sum(s.correct), 0) as correct,
      count(distinct regexp_replace(s.stage, ' · 초등학생$', ''))
        filter (where s.cleared and s.stage like '스토리 %') as story,
      count(*) filter (where s.cleared and s.stage not like '스토리 %'
        and s.stage not like '보스 · %') as survival
    from public.game_characters c
    join public.profiles p on p.user_id = c.owner_user_id
    left join public.game_scores s on s.character_id = c.id
    where p.login_id is not null
    group by c.id, p.login_id
  ), metrics as (
    select a.*, m.category, m.value
    from achievements a
    cross join lateral (values
      ('level'::text, (1 + (select count(*) from thresholds t where a.correct >= t.required))),
      ('story'::text, a.story),
      ('survival'::text, a.survival)
    ) m(category, value)
    where m.category = 'level' or m.value > 0
  ), ranked as (
    select m.*, row_number() over (
      partition by m.category order by m.value desc, m.correct desc, m.created_at, m.id
    ) as position
    from metrics m
  )
  select r.category, r.position::integer, r.player_name, r.character_name, r.value
  from ranked r where r.position <= 3 order by r.category, r.position;
$$;

revoke all on function private.hall_of_fame() from public, anon, authenticated;
-- This intentionally public summary also supports guests. It exposes at most
-- nine entries and accepts no filters or user-controlled SQL identifiers.
grant usage on schema private to anon, authenticated;
grant execute on function private.hall_of_fame() to anon, authenticated;

create function public.hall_of_fame()
returns table(category text, rank integer, player_name text, character_name text, value bigint)
language sql stable security invoker set search_path = ''
as $$ select * from private.hall_of_fame(); $$;

revoke all on function public.hall_of_fame() from public, anon, authenticated;
grant execute on function public.hall_of_fame() to anon, authenticated;
