-- Read-only regression fixtures; no production rows are inserted or changed.
with scores(character_id,stage,cleared,created_at,id) as (values (1, '스토리 LV.1 · 속삭이는 숲', true, now()+interval '0 seconds', 0),
(2, '스토리 6장 9 · 왕국수도로 가는 길', true, now()+interval '1 seconds', 1),
(2, '스토리 6장 10 · 왕국수도로 가는 길 · 초등학생', true, now()+interval '2 seconds', 2),
(2, '스토리 6장 20 · 왕국수도로 가는 길', false, now()+interval '3 seconds', 3),
(2, '스토리 1 · 속삭이는 숲', true, now()+interval '4 seconds', 4),
(3, '스토리 6A장 20 · 반전세계', true, now()+interval '5 seconds', 5),
(3, '스토리 6장 10 · 왕국수도로 가는 길', true, now()+interval '6 seconds', 6),
(4, '스토리 7A장 30 · 고대 탑', true, now()+interval '7 seconds', 7),
(4, '스토리 6A장 20 · 반전세계', true, now()+interval '8 seconds', 8),
(5, '스토리 7B장 15 · 검은 호수 · 초등학생', true, now()+interval '9 seconds', 9),
(5, '스토리 7B장 30 · 검은 호수', false, now()+interval '10 seconds', 10),
(6, 'Stage 1', true, now()+interval '11 seconds', 11),
(6, '스토리 invalid', true, now()+interval '12 seconds', 12)), ranked(id,category,expected) as (values (1,'story','1-2'),(2,'story','6B-10'),(3,'story','6A-20'),(4,'story','7A-30'),(5,'story','7B-15'),(6,'story',null),(1,'level',null)) select r.id,r.category,last_clear.label, last_clear.label is not distinct from r.expected as passed from ranked r   left join lateral (
    select concat(coalesce(parts[1], '1'),
      case when parts[1] = '6' then coalesce(parts[2], 'B') else coalesce(parts[2], '') end,
      '-', case when parts[3] = 'LV.1' then '2' else parts[3] end) as label
    from scores s
    cross join lateral regexp_match(s.stage, '^스토리 (?:([0-9]+)([AB])?장 )?([0-9]+|LV\.1) · ') as parsed(parts)
    where r.category = 'story' and s.character_id = r.id and s.cleared and parts is not null
    order by coalesce(parts[1]::integer, 1) desc,
      case when parts[3] = 'LV.1' then 2 else parts[3]::integer end desc,
      s.created_at desc, s.id desc
    limit 1
  ) last_clear on true
;
