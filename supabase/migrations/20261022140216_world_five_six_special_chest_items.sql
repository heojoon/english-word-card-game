-- World 5 and both World 6 routes: random equipment up to Special rarity.
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
      and (case when v_stage ~ '^스토리 (5장|6장|6A장) ' then i.rarity in ('normal','special')
        else i.rarity=case when v_potions>=3 then 'unique' else 'normal' end end)
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

revoke all on function public.claim_story_item_treasure(uuid,bigint) from public;
grant execute on function public.claim_story_item_treasure(uuid,bigint) to anon,authenticated;
