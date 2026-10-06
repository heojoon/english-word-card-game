-- Completed Story stages remain playable, but a later run pays no crystals.
create or replace function public.award_game_result(
  p_character_id uuid, p_stage text, p_correct integer, p_total integer,
  p_cleared boolean, p_duration_ms integer
)
returns table(game_score_id bigint, coins_earned integer, balance integer, personal_best boolean, stage_record boolean)
language plpgsql security definer set search_path = '' as $function$
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

revoke all on function public.award_game_result(uuid,text,integer,integer,boolean,integer) from public;
grant execute on function public.award_game_result(uuid,text,integer,integer,boolean,integer) to anon,authenticated;

create or replace function public.claim_stage_treasure(p_character_id uuid,p_game_score_id bigint)
returns table(reward integer,balance integer)
language plpgsql security definer set search_path = '' as $function$
declare v_class text; v_owner uuid; v_stage text; v_min integer; v_reward integer;
begin
  select c.class,c.owner_user_id into v_class,v_owner from public.game_characters c
    where c.id=p_character_id for update;
  if not found or (v_owner is not null and auth.uid() is distinct from v_owner)
    or (v_owner is null and auth.uid() is not null) then raise exception 'character not found'; end if;
  if v_owner is not null then perform 1 from public.profiles p where p.user_id=v_owner for update; end if;
  select s.stage into v_stage from public.game_scores s where s.id=p_game_score_id
    and s.character_id=p_character_id and s.cleared and not s.treasure_claimed for update;
  if not found then raise exception 'treasure unavailable or already claimed'; end if;
  update public.game_scores set treasure_claimed=true where id=p_game_score_id;
  if v_stage like U&'\C2A4\D1A0\B9AC %' and exists(
    select 1 from public.game_scores s join public.game_characters c on c.id=s.character_id
    where s.stage=v_stage and s.cleared and s.id<>p_game_score_id
      and ((v_owner is not null and c.owner_user_id=v_owner)
        or (v_owner is null and c.id=p_character_id))
  ) then
    if v_owner is not null then
      update public.profiles set crystal_balance=crystal_balance,updated_at=now()
        where user_id=v_owner returning crystal_balance into balance;
    else
      select c.coins into balance from public.game_characters c where c.id=p_character_id;
    end if;
    reward:=0; return next; return;
  end if;
  v_min:=case when v_stage like U&'\C2A4\D1A0\B9AC %' then 30 when v_class='ranger' then 20 else 10 end;
  v_reward:=v_min+floor(random()*((case when v_stage like U&'\C2A4\D1A0\B9AC %' then 51 else 31 end)-v_min))::integer;
  if v_owner is not null then
    update public.profiles set crystal_balance=crystal_balance+v_reward,updated_at=now()
      where user_id=v_owner returning crystal_balance into balance;
  else
    update public.game_characters set coins=coins+v_reward
      where id=p_character_id returning coins into balance;
  end if;
  insert into public.coin_ledger(character_id,amount,reason,game_score_id)
    values(p_character_id,v_reward,'treasure_reward',p_game_score_id);
  reward:=v_reward; return next;
end $function$;

create or replace function public.claim_story_item_treasure(p_character_id uuid,p_game_score_id bigint)
returns table(item_id bigint,item_name text,potion_count integer)
language plpgsql security definer set search_path = '' as $function$
declare v_owner uuid; v_stage text; v_item_id bigint; v_item_name text; v_potions integer;
begin
  select c.owner_user_id into v_owner from public.game_characters c where c.id=p_character_id for update;
  if not found or (v_owner is not null and auth.uid() is distinct from v_owner)
    or (v_owner is null and auth.uid() is not null) then raise exception 'character not found'; end if;
  if v_owner is not null then perform 1 from public.profiles p where p.user_id=v_owner for update; end if;
  select s.stage into v_stage from public.game_scores s where s.id=p_game_score_id
    and s.character_id=p_character_id and s.cleared and s.treasure_claimed for update;
  if not found or v_stage not like U&'\C2A4\D1A0\B9AC %' then raise exception 'story treasure unavailable'; end if;
  if exists(select 1 from public.story_item_rewards r where r.game_score_id=p_game_score_id)
    then raise exception 'story item already claimed'; end if;
  if exists(
    select 1 from public.game_scores s join public.game_characters c on c.id=s.character_id
    where s.stage=v_stage and s.cleared and s.id<>p_game_score_id
      and ((v_owner is not null and c.owner_user_id=v_owner)
        or (v_owner is null and c.id=p_character_id))
  ) then
    insert into public.story_item_rewards(game_score_id,character_id,item_id,potion_count)
      values(p_game_score_id,p_character_id,null,0);
    item_id:=null; item_name:=null; potion_count:=0; return next; return;
  end if;
  v_potions:=case when v_stage like U&'\C2A4\D1A0\B9AC 4 %' or v_stage like U&'\C2A4\D1A0\B9AC 5 %' then 3
    when v_stage like U&'\C2A4\D1A0\B9AC 3 %' then 2 else 1 end;
  select i.id,i.name into v_item_id,v_item_name from public.shop_items i
    where i.active and i.category='avatar' and i.slot<>'skin'
      and i.rarity=case when v_potions>=3 then 'unique' else 'normal' end
      and not exists(select 1 from public.character_inventory ci
        where ci.character_id=p_character_id and ci.item_id=i.id)
    order by random() limit 1;
  if v_item_id is not null then
    insert into public.character_inventory(character_id,item_id) values(p_character_id,v_item_id);
  else
    v_item_name:=U&'\BE68\AC04 \BB3C\C57D';
  end if;
  insert into public.story_item_rewards(game_score_id,character_id,item_id,potion_count)
    values(p_game_score_id,p_character_id,v_item_id,v_potions);
  insert into public.story_potion_inventory(character_id,red_potion_count)
    values(p_character_id,v_potions)
    on conflict (character_id) do update
      set red_potion_count=public.story_potion_inventory.red_potion_count+excluded.red_potion_count;
  item_id:=v_item_id; item_name:=v_item_name; potion_count:=v_potions; return next;
end $function$;

revoke all on function public.claim_stage_treasure(uuid,bigint) from public;
revoke all on function public.claim_story_item_treasure(uuid,bigint) from public;
grant execute on function public.claim_stage_treasure(uuid,bigint) to anon,authenticated;
grant execute on function public.claim_story_item_treasure(uuid,bigint) to anon,authenticated;
