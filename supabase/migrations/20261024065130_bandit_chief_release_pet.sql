-- Grant the existing Sparktail Fox to the character whose World 6B midboss clear
-- was followed by the release choice. The inventory unique key makes retries safe.
create function public.claim_bandit_chief_release_pet(p_game_score_id bigint)
returns table(item_id bigint, granted boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_character_id uuid;
  v_item_id bigint;
  v_inserted bigint;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;

  select c.id into v_character_id
    from public.game_scores s
    join public.game_characters c on c.id = s.character_id
    where s.id = p_game_score_id
      and s.stage = '스토리 6장 10 · 왕국수도로 가는 길'
      and s.cleared is true
      and c.owner_user_id = auth.uid()
    for update of c;
  if v_character_id is null then raise exception 'eligible boss clear not found'; end if;

  select i.id into v_item_id from public.shop_items i
    where i.code = 'pet_sparktail_fox' and i.category = 'avatar' and i.slot = 'pet' and i.active is true;
  if v_item_id is null then raise exception 'pet unavailable'; end if;

  insert into public.character_inventory(character_id,item_id)
    values(v_character_id,v_item_id)
    on conflict (character_id,item_id) do nothing
    returning id into v_inserted;
  return query select v_item_id, v_inserted is not null;
end $$;

revoke all on function public.claim_bandit_chief_release_pet(bigint) from public, anon;
grant execute on function public.claim_bandit_chief_release_pet(bigint) to authenticated;
