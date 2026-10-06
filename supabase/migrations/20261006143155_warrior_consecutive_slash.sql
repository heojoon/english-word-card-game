-- Story Mode active warrior skill: rapid combos add 5 crystals per combo count.
update public.story_skill_icons
set label = '연속 베기',
    asset_path = 'assets/ui/skills/active-warrior-consecutive-slash.png',
    gem_color = '#e4e1ff',
    glow_color = '#c9c4ff',
    icon_color = '#5751D8',
    updated_at = now()
where code = 'guardian_crystal';

update public.story_skill_definitions
set skill_code = 'consecutive_slash',
    skill_name = '연속 베기',
    description = '스킬을 사용한 뒤 0.3초 안에 연속으로 정답을 맞히면 콤보 수 × 5 크리스털을 추가로 받아요.',
    updated_at = now()
where class_code = 'warrior';

create or replace function public.award_game_result(
  p_character_id uuid, p_stage text, p_correct integer, p_total integer,
  p_cleared boolean, p_duration_ms integer, p_slash_bonus integer
)
returns table(game_score_id bigint, coins_earned integer, balance integer, personal_best boolean, stage_record boolean)
language plpgsql security definer set search_path = '' as $function$
declare
  v_base record;
  v_class text;
  v_owner uuid;
  v_balance integer;
begin
  if p_slash_bonus is null or p_slash_bonus < 0 then
    raise exception 'invalid slash bonus';
  end if;

  select * into v_base
  from public.award_game_result(p_character_id, p_stage, p_correct, p_total, p_cleared, p_duration_ms);

  if p_slash_bonus = 0 or v_base.coins_earned = 0 then
    return query select v_base.game_score_id, v_base.coins_earned, v_base.balance, v_base.personal_best, v_base.stage_record;
    return;
  end if;

  if p_slash_bonus::numeric > (5::numeric * p_correct * (p_correct + 1) / 2) then
    raise exception 'slash bonus exceeds combo limit';
  end if;

  select c.class, c.owner_user_id into v_class, v_owner
  from public.game_characters c where c.id = p_character_id for update;
  if v_class is distinct from 'warrior' then raise exception 'slash skill requires warrior'; end if;

  if v_owner is not null then
    update public.profiles set crystal_balance = crystal_balance + p_slash_bonus, updated_at = now()
    where user_id = v_owner returning crystal_balance into v_balance;
  else
    update public.game_characters set coins = coins + p_slash_bonus
    where id = p_character_id returning coins into v_balance;
  end if;

  update public.game_scores set coins_earned = coins_earned + p_slash_bonus
  where id = v_base.game_score_id and character_id = p_character_id;
  insert into public.coin_ledger(character_id, amount, reason, stage, game_score_id)
  values (p_character_id, p_slash_bonus, 'warrior_consecutive_slash', p_stage, v_base.game_score_id);

  return query select v_base.game_score_id, v_base.coins_earned + p_slash_bonus, v_balance, v_base.personal_best, v_base.stage_record;
end;
$function$;

revoke all on function public.award_game_result(uuid,text,integer,integer,boolean,integer,integer) from public;
grant execute on function public.award_game_result(uuid,text,integer,integer,boolean,integer,integer) to anon, authenticated;
