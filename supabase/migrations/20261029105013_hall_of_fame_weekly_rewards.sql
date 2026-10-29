-- One ranking implementation for the live podium and the closed-week snapshot.
create function private.story_clear_position(p_stage text)
returns table(stage_value bigint, label text)
language sql immutable set search_path = '' as $$
  with parsed as (
    select regexp_match(p_stage, '^스토리 (?:([1-8])([ABC])?장 )?([0-9]{1,2}|LV\.1) · ') as parts
  ), stage as (
    select coalesce(parts[1]::integer, 1) as world,
      coalesce(parts[2], case when parts[1] = '6' then 'B' else '' end) as branch,
      case when parts[3] = 'LV.1' then 2 else parts[3]::integer end as number
    from parsed where parts is not null
  )
  select (world * 1000 + number)::bigint, concat(world, branch, '-', number)
  from stage where number between 1 and case world
    when 1 then 7 when 2 then 7 when 3 then 8 when 4 then 20
    when 5 then 20 when 6 then 20 when 7 then 30 when 8 then 30 else 0 end
    and ((world = 6 and branch in ('A','B')) or (world = 7 and branch in ('A','B','C'))
      or (world not in (6,7) and branch = ''));
$$;
revoke all on function private.story_clear_position(text) from public, anon, authenticated;

create function private.hall_of_fame_at(p_cutoff timestamptz, p_week_start timestamptz)
returns table(category text, rank integer, player_name text, character_name text, value bigint,
  character_class text, avatar_variant text, skin_code text, last_story_stage text,
  character_id uuid, owner_user_id uuid)
language sql stable security definer set search_path = '' as $$
  with thresholds as (
    select level, sum(100 + (level / 10) * 20) over (order by level) as required
    from generate_series(1,99) levels(level)
  ), achievements as (
    select c.id, c.owner_user_id, c.created_at, p.login_id as player_name,
      c.name as character_name, c.class as character_class, c.avatar_variant, skin.code as skin_code,
      coalesce(sum(s.correct),0) as correct,
      count(*) filter (where s.cleared and s.stage not like '스토리 %'
        and s.stage not like '보스 · %' and s.created_at >= p_week_start) as survival
    from public.game_characters c
    join public.profiles p on p.user_id = c.owner_user_id
    left join public.shop_items skin on skin.id::text = c.equipped_items->>'skin'
    left join public.game_scores s on s.character_id = c.id and s.created_at < p_cutoff
    where p.login_id is not null and c.created_at < p_cutoff
    group by c.id, p.login_id, skin.code
  ), metrics as (
    select a.*, last_clear.label, m.category, m.value
    from achievements a
    left join lateral (
      select pos.stage_value, pos.label from public.game_scores s
      cross join lateral private.story_clear_position(s.stage) pos
      where s.character_id = a.id and s.cleared and s.created_at < p_cutoff
      order by pos.stage_value desc, s.created_at desc, s.id desc limit 1
    ) last_clear on true
    cross join lateral (values
      ('level'::text, 1 + (select count(*) from thresholds t where a.correct >= t.required)),
      ('story'::text, coalesce(last_clear.stage_value,0)), ('survival'::text, a.survival)
    ) m(category,value)
    where m.category = 'level' or m.value > 0
  ), ranked as (
    select m.*, row_number() over (partition by m.category
      order by m.value desc, m.correct desc, m.created_at, m.id) as place from metrics m
  )
  select r.category, r.place::integer, r.player_name, r.character_name, r.value,
    r.character_class, r.avatar_variant, r.skin_code,
    case when r.category = 'story' then r.label end, r.id, r.owner_user_id
  from ranked r where r.place <= 3 order by r.category, r.place;
$$;
revoke all on function private.hall_of_fame_at(timestamptz,timestamptz) from public, anon, authenticated;

create or replace function private.hall_of_fame()
returns table(category text, rank integer, player_name text, character_name text, value bigint,
  character_class text, avatar_variant text, skin_code text, last_story_stage text)
language sql stable security definer set search_path = '' as $$
  select category,rank,player_name,character_name,value,character_class,avatar_variant,skin_code,last_story_stage
  from private.hall_of_fame_at(now(), date_trunc('week',now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul');
$$;

-- Private, immutable award snapshot. Clients can neither award nor alter rankings.
create table private.hall_of_fame_awards (
  week_start date not null,
  category text not null check (category in ('level','story','survival')),
  rank integer not null check (rank between 1 and 3),
  character_id uuid references public.game_characters(id) on delete set null,
  owner_user_id uuid references public.profiles(user_id) on delete set null,
  amount integer not null check (amount in (100,200,300,500)),
  notice_id uuid not null unique,
  created_at timestamptz not null default now(),
  primary key (week_start,category,rank)
);
alter table private.hall_of_fame_awards enable row level security;
revoke all on private.hall_of_fame_awards from public, anon, authenticated;

create function private.award_hall_of_fame_week(p_week_start date default
  (date_trunc('week',now() at time zone 'Asia/Seoul')::date - 7))
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_start timestamptz := p_week_start::timestamp at time zone 'Asia/Seoul';
  v_end timestamptz := (p_week_start + 7)::timestamp at time zone 'Asia/Seoul';
  v_row record; v_notice uuid; v_amount integer; v_count integer := 0; v_category text;
begin
  if p_week_start is null or extract(isodow from p_week_start) <> 1 or v_end > now() then
    raise exception 'a completed Monday-Sunday week is required';
  end if;
  -- The first eligible week is the launch week. No retroactive gifts on install.
  if p_week_start < date '2026-10-26' then return 0; end if;
  perform pg_advisory_xact_lock(hashtextextended('hall-of-fame:' || p_week_start::text,0));
  for v_row in select * from private.hall_of_fame_at(v_end,v_start) loop
    v_amount := case v_row.rank when 1 then 300 when 2 then 200 else 100 end
      + case when v_row.category = 'survival' and v_row.rank = 1 then 200 else 0 end;
    v_notice := gen_random_uuid();
    insert into private.hall_of_fame_awards(week_start,category,rank,character_id,owner_user_id,amount,notice_id)
      values(p_week_start,v_row.category,v_row.rank,v_row.character_id,v_row.owner_user_id,v_amount,v_notice)
      on conflict (week_start,category,rank) do nothing;
    if not found then continue; end if;
    v_category := case v_row.category when 'level' then '레벨' when 'story' then '스토리' else '서바이벌' end;
    insert into public.game_notices(id,sender_id,title,kind,body,audience,rewards)
      values(v_notice,null,format('🏆 명예의 전당 · %s %s위 축하해요!',v_category,v_row.rank),'event',
        format(E'✦ 이번 주, 크리스털처럼 빛난 모험가 ✦\n\n%s님의 %s!\n%s 부문 %s위에 오른 것을 축하해요.\n\n◇ 집계 기간: %s ~ %s (한국시간)\n◇ 영광의 기록: %s\n\n◆ 순위 보상: %s 크리스털%s\n◆ 총 선물: %s 크리스털\n\n아래 ‘받기’를 누르면 계정 공용 지갑에 쌓여요.\n여러 부문·캐릭터가 입상하면 보상도 각각 받을 수 있어요.\n\n매주 일요일 밤 12시, 새로운 시상이 찾아와요.\n다음 모험에서도 반짝이는 도전을 이어가요! ✨',
          v_row.player_name,v_row.character_name,v_category,v_row.rank,
          to_char(p_week_start,'MM.DD'),to_char(p_week_start+6,'MM.DD'),
          case v_row.category when 'level' then 'LV.'||v_row.value::text
            when 'story' then v_row.last_story_stage||' 클리어' else v_row.value::text||'회 클리어' end,
          case v_row.rank when 1 then 300 when 2 then 200 else 100 end,
          case when v_row.category='survival' and v_row.rank=1 then E'\n◆ 서바이벌 우승 추가 보상: +200 크리스털' else '' end,v_amount),
        'selected',jsonb_build_array(jsonb_build_object('currency','crystals','quantity',v_amount,'name','크리스털',
          'hall_of_fame',jsonb_build_object('category',v_row.category,'rank',v_row.rank,'week_start',p_week_start))));
    insert into public.game_notice_receipts(notice_id,user_id) values(v_notice,v_row.owner_user_id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;
revoke all on function private.award_hall_of_fame_week(date) from public, anon, authenticated;

-- pg_cron runs in GMT: Sunday 15:00 UTC = Monday 00:00 Asia/Seoul.
select cron.schedule('wordoria-hall-of-fame-weekly-awards','0 15 * * 0',
  'select private.award_hall_of_fame_week();');
