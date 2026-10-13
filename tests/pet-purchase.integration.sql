-- Production integration checks use isolated fixtures and roll back every change.
begin;
do $test$
declare
  v_owner uuid := gen_random_uuid();
  v_other uuid := gen_random_uuid();
  v_character uuid;
  v_poor uuid;
  v_item public.shop_items%rowtype;
  v_balance integer := 100000;
  v_actual integer;
  v_inventory integer;
  v_equipped text;
  v_rejected boolean;
begin
  insert into auth.users(id) values(v_owner),(v_other);
  insert into public.profiles(user_id,display_name,crystal_balance)
    values(v_owner,'pet-integration',v_balance)
    on conflict(user_id) do update set crystal_balance=excluded.crystal_balance;
  insert into public.game_characters(player,name,class,owner_user_id)
    values('pet-test','pet-test','warrior',v_owner) returning id into v_character;
  perform set_config('request.jwt.claim.sub',v_owner::text,true);
  for v_item in select * from public.shop_items where code like 'pet_%' and active order by price loop
    perform public.purchase_shop_item(v_character,v_item.id);
    v_balance := v_balance-v_item.price;
    select crystal_balance into v_actual from public.profiles where user_id=v_owner;
    if v_actual<>v_balance then raise exception 'pet wallet debit mismatch'; end if;
    perform public.equip_avatar_slot(v_character,v_item.id,'pet');
    select equipped_items->>'pet' into v_equipped from public.game_characters where id=v_character;
    if v_equipped is distinct from v_item.id::text then raise exception 'pet equip mismatch'; end if;
    perform public.purchase_shop_item(v_character,v_item.id);
    v_balance := v_balance-v_item.price;
    if (select count(*) from public.character_inventory where character_id=v_character and item_id=v_item.id)<>2 then
      raise exception 'duplicate pet quantity mismatch';
    end if;
  end loop;
  select count(*) into v_inventory from public.character_inventory where character_id=v_character;
  if v_inventory<>20 then raise exception 'twenty pet copies required'; end if;
  select crystal_balance into v_actual from public.profiles where user_id=v_owner;
  if v_actual<>v_balance then raise exception 'duplicate purchase wallet mismatch'; end if;
  perform public.equip_avatar_slot(v_character,null,'pet');
  select equipped_items->>'pet' into v_equipped from public.game_characters where id=v_character;
  if v_equipped is not null then raise exception 'pet unequip failed'; end if;
  perform set_config('request.jwt.claim.sub',v_other::text,true);
  v_rejected := false;
  begin
    perform public.equip_avatar_slot(v_character,v_item.id,'pet');
  exception when raise_exception then
    if sqlerrm<>'character not found' then raise; end if;
    v_rejected := true;
  end;
  if not v_rejected then raise exception 'pet ownership check bypassed'; end if;
  perform set_config('request.jwt.claim.sub',v_owner::text,true);
  insert into public.game_characters(player,name,class,owner_user_id)
    values('pet-test','pet-poor','mage',v_owner) returning id into v_poor;
  update public.profiles set crystal_balance=0 where user_id=v_owner;
  v_rejected := false;
  begin
    perform public.purchase_shop_item(v_poor,v_item.id);
  exception when raise_exception then
    if sqlerrm<>'not enough crystals' then raise; end if;
    v_rejected := true;
  end;
  if not v_rejected then raise exception 'unfunded pet purchase allowed'; end if;
  if exists(select 1 from public.character_inventory where character_id=v_poor) then raise exception 'unfunded purchase granted pet'; end if;
end;
$test$;
select 'twenty purchases, wallet debits, duplicate copies and unfunded purchase rejection, equip/unequip and ownership checks passed' as result;
rollback;
