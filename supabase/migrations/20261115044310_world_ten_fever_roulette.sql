-- World 10 ordinary and optional stages use the existing atomic weighted roulette.
-- Lower the receipt clock floor; the RPC still enforces the per-world/class cap.
alter table public.story_roulette_receipts drop constraint story_roulette_receipts_time_limit_ms_check;
alter table public.story_roulette_receipts add constraint story_roulette_receipts_time_limit_ms_check
  check (time_limit_ms between 180000 and 440000 and (time_limit_ms-180000)%5000=0);

create or replace function public.claim_story_roulette_reward(
  p_request_id uuid,p_character_id uuid,p_stage text,p_correct integer,
  p_total integer,p_duration_ms integer,p_time_limit_ms integer,p_slash_bonus integer default 0
)
returns jsonb language plpgsql security definer set search_path='' as $function$
declare
  v_owner uuid; v_class text; v_balance integer; v_base record; v_receipt public.story_roulette_receipts%rowtype;
  v_questions integer; v_base_ms integer; v_previous_stage text;
  v_index integer; v_bonus integer; v_paid integer; v_stage_number integer; v_result jsonb;
begin
  select c.owner_user_id,c.class into v_owner,v_class from public.game_characters c where c.id=p_character_id for update;
  if not found or v_owner is null or auth.uid() is distinct from v_owner then raise exception 'character not found'; end if;
  select p.crystal_balance into v_balance from public.profiles p where p.user_id=v_owner for update;
  if not found then raise exception 'account wallet unavailable'; end if;
  if p_stage ~ '^스토리 8장 ([1-9]|[12][0-9]) · 잿빛 종이 울리는 마을$'
    or p_stage ~ '^스토리 9장 ([1-9]|[12][0-9]) · 새벽의 수련원$' then
    v_questions:=40; v_base_ms:=240000;
    v_stage_number:=substring(p_stage from '^스토리 [89]장 ([0-9]+) ')::integer;
    if v_stage_number=15 then raise exception 'boss has no roulette fever'; end if;
    if v_stage_number>1 then
      v_previous_stage:=regexp_replace(p_stage,'장 [0-9]+ ·','장 '||(v_stage_number-1)::text||' ·');
    elsif p_stage like '스토리 9장 %' then
      v_previous_stage:='스토리 8장 30 · 잿빛 종이 울리는 마을';
    end if;
  elsif p_stage ~ '^스토리 10장 ([1-9]|[12][0-9]|3[0-9]) · 별빛이 끊긴 관측탑$'
    or p_stage ~ '^스토리 10장 번외 [12] · 별빛이 끊긴 관측탑$' then
    v_questions:=30; v_base_ms:=180000;
    if p_stage like '스토리 10장 번외 %' then
      v_previous_stage:=case when p_stage like '스토리 10장 번외 1 %'
        then '스토리 10장 20 · 별빛이 끊긴 관측탑'
        else '스토리 10장 번외 1 · 별빛이 끊긴 관측탑' end;
    else
      v_stage_number:=substring(p_stage from '^스토리 10장 ([0-9]+) ')::integer;
      if v_stage_number=20 then raise exception 'boss has no roulette fever'; end if;
      v_previous_stage:=case when v_stage_number=1 then '스토리 9장 30 · 새벽의 수련원'
        else '스토리 10장 '||(v_stage_number-1)::text||' · 별빛이 끊긴 관측탑' end;
    end if;
  else
    raise exception 'invalid roulette clear';
  end if;
  if p_request_id is null
    or p_correct is distinct from v_questions or p_total is distinct from v_questions
    or p_time_limit_ms is null or p_time_limit_ms<v_base_ms
    or p_time_limit_ms>v_base_ms+(case when v_class='warrior' then v_questions*5000 else 0 end)
    or (p_time_limit_ms-v_base_ms)%5000<>0
    or p_duration_ms is null or p_duration_ms<0 or p_duration_ms>p_time_limit_ms
    or p_slash_bonus is null or p_slash_bonus<0 then raise exception 'invalid roulette clear'; end if;

  select * into v_receipt from public.story_roulette_receipts r where r.request_id=p_request_id;
  if found then
    if v_receipt.owner_user_id<>v_owner or v_receipt.character_id<>p_character_id
      or v_receipt.stage<>p_stage or v_receipt.duration_ms<>p_duration_ms or v_receipt.time_limit_ms<>p_time_limit_ms then raise exception 'roulette request mismatch'; end if;
    return jsonb_build_object('index',v_receipt.spin_index,'bonus',v_receipt.bonus,
      'result',jsonb_set(v_receipt.result,'{balance}',to_jsonb(v_balance)));
  end if;
  if not exists(select 1 from public.profiles p where p.user_id=v_owner and p.role='admin')
    and not exists(select 1 from public.game_scores s join public.game_characters c on c.id=s.character_id
      where c.owner_user_id=v_owner and s.cleared and (
        (v_previous_stage is not null and s.stage=v_previous_stage)
        or (v_previous_stage is null and s.stage in
          ('스토리 7A장 30 · 심연의 불타는 고대 탑','스토리 7B장 30 · 심연의 검은 호수','스토리 7C장 30 · 왕국 지하 던전'))))
    then raise exception 'previous stage clear required'; end if;

  -- Existing weighted distribution. Never accept a client-supplied multiplier or bonus.
  v_index:=private.story_roulette_index(floor(random()*100)::integer);
  v_bonus:=round((p_time_limit_ms-p_duration_ms)::numeric/1000*(array[1,2,3,0.5,0,1.5]::numeric[])[v_index+1])::integer;
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
  insert into public.story_roulette_receipts(request_id,owner_user_id,character_id,stage,duration_ms,time_limit_ms,spin_index,bonus,game_score_id,result)
    values(p_request_id,v_owner,p_character_id,p_stage,p_duration_ms,p_time_limit_ms,v_index,v_bonus,v_base.game_score_id,v_result);
  return jsonb_build_object('index',v_index,'bonus',v_bonus,'result',v_result);
end $function$;
revoke all on function public.claim_story_roulette_reward(uuid,uuid,text,integer,integer,integer,integer,integer) from public,anon;
grant execute on function public.claim_story_roulette_reward(uuid,uuid,text,integer,integer,integer,integer,integer) to authenticated;
