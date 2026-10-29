-- The internal rank uses the furthest completed stage. Keep the public numeric
-- field compatible with already installed clients that render it as a count;
-- updated clients display last_story_stage instead. Never publish the encoded
-- world*1000+stage sorting key as a misleading count on older web/native apps.
create or replace function private.hall_of_fame()
returns table(category text, rank integer, player_name text, character_name text, value bigint,
  character_class text, avatar_variant text, skin_code text, last_story_stage text)
language sql stable security definer set search_path = '' as $$
  select f.category,f.rank,f.player_name,f.character_name,
    case when f.category = 'story' then (
      select count(distinct regexp_replace(s.stage,' · 초등학생$',''))
      from public.game_scores s where s.character_id=f.character_id and s.cleared
        and s.stage like '스토리 %' and s.created_at < now()
    ) else f.value end,
    f.character_class,f.avatar_variant,f.skin_code,f.last_story_stage
  from private.hall_of_fame_at(now(), date_trunc('week',now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul') f;
$$;
