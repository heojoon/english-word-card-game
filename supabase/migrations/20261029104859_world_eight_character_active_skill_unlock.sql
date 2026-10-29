-- World 8 unlocks the clearing character's additional active, independently of account rewards.
create table public.character_active_skill_unlocks (
  character_id uuid primary key references public.game_characters(id) on delete cascade,
  class_code text not null check (class_code in ('warrior','mage','pugilist','ranger','sniper')),
  source_game_score_id bigint references public.game_scores(id) on delete set null,
  unlocked_at timestamptz not null default now()
);
alter table public.character_active_skill_unlocks enable row level security;
revoke all on public.character_active_skill_unlocks from public,anon,authenticated;
grant select on public.character_active_skill_unlocks to authenticated;
create policy "owners read character active skills"
  on public.character_active_skill_unlocks for select to authenticated
  using (exists (
    select 1 from public.game_characters c
    where c.id=character_id and c.owner_user_id=(select auth.uid())
  ));
comment on table public.character_active_skill_unlocks is
  'Per-character World 8 final-boss unlocks; written only by the validated award_game_result RPC.';

CREATE OR REPLACE FUNCTION public.award_game_result(p_character_id uuid, p_stage text, p_correct integer, p_total integer, p_cleared boolean, p_duration_ms integer)
 RETURNS TABLE(game_score_id bigint, coins_earned integer, balance integer, personal_best boolean, stage_record boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_player text; v_class text; v_owner uuid; v_score bigint;
  v_question integer; v_combo integer; v_clear integer; v_reward integer;
  v_balance integer; v_personal boolean := false; v_record boolean := false;
  v_prev_personal integer; v_prev_global integer; v_story_replay boolean := false;
begin
  select c.player,c.class,c.owner_user_id into v_player,v_class,v_owner
  from public.game_characters c where c.id=p_character_id for update;
  if not found or (v_owner is not null and auth.uid() is distinct from v_owner)
    or (v_owner is null and auth.uid() is not null) then raise exception 'character not found'; end if;
  if p_stage is null or p_stage='' or p_total<=0 or p_correct<0 or p_correct>p_total
    or (p_cleared and p_correct<>p_total) or p_duration_ms is null or p_duration_ms<0
    then raise exception 'invalid score'; end if;

  if p_stage = '스토리 8장 30 · 잿빛 종이 울리는 마을' and p_cleared
    and (p_total <> 40 or p_correct <> 40 or p_duration_ms < 1 or p_duration_ms > 120000) then
    raise exception 'invalid world eight final clear';
  end if;

  if v_owner is not null then
    perform 1 from public.profiles p where p.user_id=v_owner for update;
  end if;
  if p_stage like U&'\C2A4\D1A0\B9AC %' then
    select exists(
      select 1 from public.game_scores s
      join public.game_characters c on c.id=s.character_id
      where s.stage=p_stage and s.cleared
        and ((v_owner is not null and c.owner_user_id=v_owner)
          or (v_owner is null and c.id=p_character_id))
    ) into v_story_replay;
  end if;

  v_question:=p_correct;
  v_combo:=floor(p_correct / case when v_class='pugilist' then 3.0 else 5.0 end)::integer;
  v_clear:=case when p_cleared then 10 else 0 end;
  v_reward:=case when v_story_replay then 0 else v_question+v_combo+v_clear end;
  if p_cleared then
    select min(s.duration_ms) into v_prev_personal from public.game_scores s
      where s.character_id=p_character_id and s.stage=p_stage and s.cleared;
    select min(s.duration_ms) into v_prev_global from public.game_scores s
      where s.stage=p_stage and s.cleared;
    v_personal:=v_prev_personal is null or p_duration_ms<v_prev_personal;
    v_record:=v_prev_global is null or p_duration_ms<v_prev_global;
  end if;
  insert into public.game_scores(player,stage,correct,total,cleared,character_id,duration_ms,coins_earned)
    values(v_player,p_stage,p_correct,p_total,p_cleared,p_character_id,p_duration_ms,v_reward)
    returning id into v_score;
  -- Unlock even when the account has already received its first-clear payout.
  if p_stage = '스토리 8장 30 · 잿빛 종이 울리는 마을' and p_cleared
    and v_class in ('warrior','mage','pugilist','ranger','sniper') then
    insert into public.character_active_skill_unlocks(character_id,class_code,source_game_score_id)
      values(p_character_id,v_class,v_score)
      on conflict (character_id) do nothing;
  end if;
  if v_owner is not null then
    update public.profiles set crystal_balance=crystal_balance+v_reward,updated_at=now()
      where user_id=v_owner returning crystal_balance into v_balance;
  else
    update public.game_characters set coins=coins+v_reward
      where id=p_character_id returning coins into v_balance;
  end if;
  if not v_story_replay then
    if v_question>0 then insert into public.coin_ledger(character_id,amount,reason,stage,game_score_id)
      values(p_character_id,v_question,'question_reward',p_stage,v_score); end if;
    if v_combo>0 then insert into public.coin_ledger(character_id,amount,reason,stage,game_score_id)
      values(p_character_id,v_combo,'combo_bonus',p_stage,v_score); end if;
    if v_clear>0 then insert into public.coin_ledger(character_id,amount,reason,stage,game_score_id)
      values(p_character_id,v_clear,'stage_clear_bonus',p_stage,v_score); end if;
  end if;
  return query select v_score,v_reward,v_balance,v_personal,v_record;
end $function$;

-- Backfill only characters with their own valid final clear, never account-wide story progress.
insert into public.character_active_skill_unlocks(character_id,class_code,source_game_score_id,unlocked_at)
select distinct on (s.character_id) s.character_id,c.class,s.id,s.created_at
from public.game_scores s join public.game_characters c on c.id=s.character_id
where s.stage='스토리 8장 30 · 잿빛 종이 울리는 마을'
  and s.cleared and s.total=40 and s.correct=40 and s.duration_ms between 1 and 120000
  and c.class in ('warrior','mage','pugilist','ranger','sniper')
order by s.character_id,s.created_at,s.id
on conflict (character_id) do nothing;
