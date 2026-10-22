-- Temporary production fixtures; all changes are rolled back.
begin;
do $test$
declare
  v_owner uuid:=gen_random_uuid(); v_character uuid; v_score bigint;
  v_world text; v_rarity text; v_reward record; v_seen text[]; v_rejected boolean;
begin
  insert into auth.users(id) values(v_owner);
  insert into public.profiles(user_id,display_name,role) values(v_owner,'chest-test','admin') on conflict(user_id) do update set role='admin';
  insert into public.game_characters(player,name,class,owner_user_id)
    values('chest-test','chest-test','warrior',v_owner) returning id into v_character;
  perform set_config('request.jwt.claim.sub',v_owner::text,true);
  foreach v_world in array array['5장','6장','6A장'] loop
    v_seen:=array[]::text[];
    for n in 1..40 loop
      insert into public.game_scores(player,stage,correct,total,cleared,character_id,duration_ms,treasure_claimed)
        values('chest-test','스토리 '||v_world||' '||n||' · chest-test',1,1,true,v_character,1000,true) returning id into v_score;
      select * into v_reward from public.claim_story_item_treasure(v_character,v_score);
      select rarity into v_rarity from public.shop_items where id=v_reward.item_id;
      if v_rarity is null or v_rarity not in ('normal','special') then
        raise exception 'invalid chest rarity for %: %',v_world,v_rarity;
      end if;
      v_seen:=array_append(v_seen,v_rarity);
    end loop;
    if not (v_seen @> array['normal','special']) then raise exception 'missing rarity for %',v_world; end if;
  end loop;
  v_rejected:=false;
  begin
    perform public.claim_story_item_treasure(v_character,v_score);
  exception when raise_exception then
    if sqlerrm<>'story item already claimed' then raise; end if;
    v_rejected:=true;
  end;
  if not v_rejected then raise exception 'duplicate claim allowed'; end if;
  insert into public.game_scores(player,stage,correct,total,cleared,character_id,duration_ms,treasure_claimed)
    select player,stage,correct,total,cleared,character_id,duration_ms,treasure_claimed
    from public.game_scores where id=v_score returning id into v_score;
  select * into v_reward from public.claim_story_item_treasure(v_character,v_score);
  if v_reward.item_id is not null or v_reward.potion_count<>0 then raise exception 'replay granted reward'; end if;
end;
$test$;
select 'World 5, 6B, 6A normal/special drops, duplicate claim and replay protection passed' as result;
rollback;
