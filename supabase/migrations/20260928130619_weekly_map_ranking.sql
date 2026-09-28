-- Return only the three fastest clears for the current Monday-Sunday week in Korea.
-- Keep the privileged query outside the exposed API schema.
create or replace function private.weekly_map_ranking(p_stage text)
returns table(rank integer, character_name text, character_class text, avatar_variant text, duration_ms integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_map_id uuid;
  v_user_id uuid := auth.uid();
  v_week_start timestamptz := (date_trunc('week', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul');
begin
  if p_stage ~ '^제작 맵 · [0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    v_map_id := split_part(p_stage, ' · ', 2)::uuid;
    if v_user_id is null or not exists (
      select 1 from public.maps m
      where m.id = v_map_id and m.status = 'published'
        and (m.owner_user_id = v_user_id or m.visibility = 'public'
          or exists (select 1 from public.map_access_grants g where g.map_id = m.id and g.user_id = v_user_id)
          or exists (select 1 from public.profiles p where p.user_id = v_user_id and p.role = 'admin'))
    ) then
      return;
    end if;
  elsif p_stage !~ '^Stage [1-7]$' then
    return;
  end if;

  return query
  with personal_best as (
    select s.duration_ms, s.created_at, s.id, s.player, c.name, c.class, c.avatar_variant,
      row_number() over (
        partition by coalesce(c.owner_user_id::text, 'guest:' || s.player)
        order by s.duration_ms, s.created_at, s.id
      ) as personal_rank
    from public.game_scores s
    left join public.game_characters c on c.id = s.character_id
    where s.stage = p_stage and s.cleared = true and s.duration_ms is not null
      and s.created_at >= v_week_start and s.created_at < v_week_start + interval '7 days'
  )
  select row_number() over (order by b.duration_ms, b.created_at, b.id)::integer,
    coalesce(b.name, b.player, '모험가'), b.class, b.avatar_variant, b.duration_ms
  from personal_best b
  where b.personal_rank = 1
  order by b.duration_ms, b.created_at, b.id
  limit 3;
end;
$$;

revoke all on function private.weekly_map_ranking(text) from public, anon, authenticated;
grant usage on schema private to anon, authenticated;
grant execute on function private.weekly_map_ranking(text) to anon, authenticated;

create or replace function public.weekly_map_ranking(p_stage text)
returns table(rank integer, character_name text, character_class text, avatar_variant text, duration_ms integer)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.weekly_map_ranking(p_stage);
$$;

revoke all on function public.weekly_map_ranking(text) from public, anon, authenticated;
grant execute on function public.weekly_map_ranking(text) to anon, authenticated;

create index if not exists game_scores_weekly_clear_rank_idx
  on public.game_scores(stage, created_at, duration_ms)
  where cleared = true and duration_ms is not null;
