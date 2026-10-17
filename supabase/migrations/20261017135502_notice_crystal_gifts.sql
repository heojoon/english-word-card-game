-- Crystal gifts credit the recipient account atomically with the claim receipt.
create or replace function game_notice_private.send_game_notice(p_request_id uuid,p_title text,p_kind text,p_body text,p_audience text,p_user_ids uuid[],p_rewards jsonb)
returns integer language plpgsql security definer set search_path='' as $$
declare
  v_rewards jsonb:='[]'; v_reward jsonb; v_item public.shop_items%rowtype;
  v_quantity integer; v_count integer; v_existing public.game_notices%rowtype;
begin
  if auth.uid() is null or not exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.role='admin') then raise exception 'admin required'; end if;
  if p_request_id is null or p_title is null or length(btrim(p_title)) not between 1 and 100
    or p_body is null or length(btrim(p_body)) not between 1 and 10000
    or p_kind is null or p_kind not in ('notice','event','other')
    or p_audience is null or p_audience not in ('all','selected')
    or p_rewards is null or jsonb_typeof(p_rewards)<>'array' then raise exception 'invalid notice'; end if;
  if jsonb_array_length(p_rewards)>100 then raise exception 'too many rewards'; end if;
  -- Serialize retries of the same request so a network retry cannot send twice.
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
  select * into v_existing from public.game_notices where id=p_request_id;
  if found then
    if v_existing.sender_id is distinct from auth.uid() then raise exception 'invalid request'; end if;
    return (select count(*)::integer from public.game_notice_receipts where notice_id=p_request_id);
  end if;
  if p_audience='selected' and (coalesce(cardinality(p_user_ids),0)=0 or exists(
    select 1 from unnest(p_user_ids) u(id) where not exists(select 1 from public.profiles p where p.user_id=u.id)
  )) then raise exception 'invalid recipients'; end if;
  for v_reward in select value from jsonb_array_elements(p_rewards) loop
    if coalesce(v_reward->>'quantity','') !~ '^[0-9]{1,3}$' then raise exception 'invalid quantity'; end if;
    v_quantity:=(v_reward->>'quantity')::integer;
    if v_quantity not between 1 and 999 then raise exception 'invalid quantity'; end if;
    if v_reward ? 'currency' then
      if v_reward->>'currency' is distinct from 'crystals' then raise exception 'invalid reward currency'; end if;
      v_rewards:=v_rewards||jsonb_build_array(jsonb_build_object('currency','crystals','quantity',v_quantity,'name','크리스털'));
    elsif v_reward->>'potion_type' in ('red','blue') then
      v_rewards:=v_rewards||jsonb_build_array(jsonb_build_object('potion_type',v_reward->>'potion_type','quantity',v_quantity,
        'name',case when v_reward->>'potion_type'='red' then '힐링포션' else '마나포션' end));
    else
      select * into v_item from public.shop_items where id=(v_reward->>'item_id')::bigint and active and category='avatar';
      if not found then raise exception 'invalid reward item'; end if;
      v_rewards:=v_rewards||jsonb_build_array(jsonb_build_object('item_id',v_item.id,'quantity',v_quantity,'name',v_item.name,'art_path',v_item.art_path));
    end if;
  end loop;
  if exists(select 1 from jsonb_array_elements(v_rewards) r group by coalesce(r->>'currency',r->>'potion_type',r->>'item_id') having count(*)>1) then raise exception 'duplicate reward'; end if;
  insert into public.game_notices(id,sender_id,title,kind,body,audience,rewards)
    values(p_request_id,auth.uid(),btrim(p_title),p_kind,btrim(p_body),p_audience,v_rewards);
  insert into public.game_notice_receipts(notice_id,user_id)
    select p_request_id,p.user_id from public.profiles p where p_audience='all' or p.user_id=any(p_user_ids);
  get diagnostics v_count=row_count;
  if v_count=0 then raise exception 'no recipients'; end if;
  return v_count;
end $$;

create or replace function game_notice_private.claim_game_notice(p_notice_id uuid,p_character_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_receipt public.game_notice_receipts%rowtype; v_rewards jsonb; v_reward jsonb; v_quantity integer;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into v_receipt from public.game_notice_receipts where notice_id=p_notice_id and user_id=auth.uid() for update;
  if not found then raise exception 'notice not found'; end if;
  -- A successful retry is harmless; dismissed unclaimed notices cannot pay out.
  if v_receipt.claimed_at is not null then return; end if;
  if v_receipt.dismissed_at is not null then raise exception 'notice dismissed'; end if;
  select rewards into strict v_rewards from public.game_notices where id=p_notice_id;
  -- Account currency does not require a character; equipment and potions do.
  if p_character_id is not null or exists(select 1 from jsonb_array_elements(v_rewards) r where r->>'currency' is distinct from 'crystals') then
    perform 1 from public.game_characters where id=p_character_id and owner_user_id=auth.uid() for update;
    if not found then raise exception 'character not found'; end if;
  end if;
  for v_reward in select value from jsonb_array_elements(v_rewards) loop
    v_quantity:=(v_reward->>'quantity')::integer;
    if v_reward->>'currency'='crystals' then
      update public.profiles set crystal_balance=crystal_balance+v_quantity,updated_at=now() where user_id=auth.uid();
      if not found then raise exception 'profile not found'; end if;
    elsif v_reward->>'potion_type' in ('red','blue') then
      insert into public.story_potion_inventory(character_id,red_potion_count,blue_potion_count,potion_count_model)
        values(p_character_id,case when v_reward->>'potion_type'='red' then v_quantity else 0 end,
          case when v_reward->>'potion_type'='blue' then v_quantity else 0 end,'remaining')
        on conflict(character_id) do update set
          red_potion_count=public.story_potion_inventory.red_potion_count+excluded.red_potion_count,
          blue_potion_count=public.story_potion_inventory.blue_potion_count+excluded.blue_potion_count;
    else
      insert into public.character_inventory(character_id,item_id)
        select p_character_id,(v_reward->>'item_id')::bigint from generate_series(1,v_quantity);
    end if;
  end loop;
  update public.game_notice_receipts set claimed_at=now(),dismissed_at=now(),character_id=p_character_id
    where notice_id=p_notice_id and user_id=auth.uid();
end $$;

