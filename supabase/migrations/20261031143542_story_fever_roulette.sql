-- One server-selected outcome and atomic payout per request. Existing overloads
-- and the crystal-tapping fever in earlier worlds remain unchanged.
create table public.story_roulette_receipts (
  request_id uuid primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  character_id uuid not null references public.game_characters(id) on delete cascade,
  stage text not null,
  duration_ms integer not null check (duration_ms between 0 and 240000),
  spin_index smallint not null check (spin_index between 0 and 4),
  bonus integer not null check (bonus between 0 and 720),
  game_score_id bigint not null references public.game_scores(id) on delete cascade,
  result jsonb not null,
  created_at timestamptz not null default now()
);
create index story_roulette_receipts_owner_idx on public.story_roulette_receipts(owner_user_id);
create index story_roulette_receipts_character_idx on public.story_roulette_receipts(character_id);
create index story_roulette_receipts_score_idx on public.story_roulette_receipts(game_score_id);
alter table public.story_roulette_receipts enable row level security;
revoke all on public.story_roulette_receipts from anon,authenticated;
grant select on public.story_roulette_receipts to authenticated;
create policy "Owners read their roulette receipts" on public.story_roulette_receipts
  for select to authenticated using ((select auth.uid())=owner_user_id);

create function public.claim_story_roulette_reward(
  p_request_id uuid,p_character_id uuid,p_stage text,p_correct integer,
  p_total integer,p_duration_ms integer,p_slash_bonus integer default 0
)
returns jsonb language plpgsql security definer set search_path='' as $function$
declare
  v_owner uuid; v_balance integer; v_base record; v_receipt public.story_roulette_receipts%rowtype;
  v_index integer; v_bonus integer; v_paid integer; v_stage_number integer; v_result jsonb;
begin
  select c.owner_user_id into v_owner from public.game_characters c where c.id=p_character_id for update;
  if not found or v_owner is null or auth.uid() is distinct from v_owner then raise exception 'character not found'; end if;
  select p.crystal_balance into v_balance from public.profiles p where p.user_id=v_owner for update;
  if not found then raise exception 'account wallet unavailable'; end if;
  if p_request_id is null or p_stage is null
    or p_stage !~ '^스토리 8장 ([1-9]|[12][0-9]) · 잿빛 종이 울리는 마을$'
    or p_correct is distinct from 40 or p_total is distinct from 40
    or p_duration_ms is null or p_duration_ms<0 or p_duration_ms>240000
    or p_slash_bonus is null or p_slash_bonus<0 then raise exception 'invalid roulette clear'; end if;
  v_stage_number:=substring(p_stage from '^스토리 8장 ([0-9]+) ')::integer;
  if v_stage_number=15 then raise exception 'boss has no roulette fever'; end if;

  select * into v_receipt from public.story_roulette_receipts r where r.request_id=p_request_id;
  if found then
    if v_receipt.owner_user_id<>v_owner or v_receipt.character_id<>p_character_id
      or v_receipt.stage<>p_stage or v_receipt.duration_ms<>p_duration_ms then raise exception 'roulette request mismatch'; end if;
    return jsonb_build_object('index',v_receipt.spin_index,'bonus',v_receipt.bonus,
      'result',jsonb_set(v_receipt.result,'{balance}',to_jsonb(v_balance)));
  end if;
  if v_stage_number>1 and not exists(select 1 from public.profiles p where p.user_id=v_owner and p.role='admin')
    and not exists(select 1 from public.game_scores s join public.game_characters c on c.id=s.character_id
      where c.owner_user_id=v_owner and s.cleared and s.stage='스토리 8장 '||(v_stage_number-1)::text||' · 잿빛 종이 울리는 마을')
    then raise exception 'previous stage clear required'; end if;
  if v_stage_number=1 and not exists(select 1 from public.profiles p where p.user_id=v_owner and p.role='admin')
    and not exists(select 1 from public.game_scores s join public.game_characters c on c.id=s.character_id
      where c.owner_user_id=v_owner and s.cleared and s.stage in
        ('스토리 7A장 30 · 심연의 불타는 고대 탑','스토리 7B장 30 · 심연의 검은 호수','스토리 7C장 30 · 왕국 지하 던전'))
    then raise exception 'previous world clear required'; end if;

  -- Five equal intervals. Never accept a client-supplied multiplier or bonus.
  v_index:=floor(random()*5)::integer;
  v_bonus:=round((240000-p_duration_ms)::numeric/1000*(array[1,2,3,0.5,0]::numeric[])[v_index+1])::integer;
  select * into v_base from public.award_game_result(p_character_id,p_stage,p_correct,p_total,true,p_duration_ms,p_slash_bonus);
  v_paid:=case when v_base.coins_earned=0 then 0 else v_bonus end;
  v_balance:=v_base.balance;
  if v_paid>0 then
    update public.profiles set crystal_balance=crystal_balance+v_paid,updated_at=now()
      where user_id=v_owner returning crystal_balance into v_balance;
    update public.game_scores set coins_earned=coins_earned+v_paid where id=v_base.game_score_id;
    insert into public.coin_ledger(character_id,amount,reason,stage,game_score_id)
      values(p_character_id,v_paid,'fever_bonus',p_stage,v_base.game_score_id);
  end if;
  v_result:=jsonb_build_object('game_score_id',v_base.game_score_id,'coins_earned',v_base.coins_earned+v_paid,
    'balance',v_balance,'personal_best',v_base.personal_best,'stage_record',v_base.stage_record);
  insert into public.story_roulette_receipts(request_id,owner_user_id,character_id,stage,duration_ms,spin_index,bonus,game_score_id,result)
    values(p_request_id,v_owner,p_character_id,p_stage,p_duration_ms,v_index,v_bonus,v_base.game_score_id,v_result);
  return jsonb_build_object('index',v_index,'bonus',v_bonus,'result',v_result);
end $function$;
revoke all on function public.claim_story_roulette_reward(uuid,uuid,text,integer,integer,integer,integer) from public,anon;
grant execute on function public.claim_story_roulette_reward(uuid,uuid,text,integer,integer,integer,integer) to authenticated;
comment on function public.claim_story_roulette_reward(uuid,uuid,text,integer,integer,integer,integer) is
  'World 8 ordinary clears: equal-probability roulette, final-product rounding and idempotent atomic first-clear payout.';
