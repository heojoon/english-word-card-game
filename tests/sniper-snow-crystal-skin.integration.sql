-- Production-safe fixtures: all data, balances and equipment are rolled back.
begin;
do $test$
declare
  v_owner uuid:=gen_random_uuid(); v_other uuid:=gen_random_uuid();
  v_sniper uuid; v_warrior uuid; v_item bigint; v_price integer;
  v_rejected boolean; v_equipped jsonb;
begin
  insert into auth.users(id) values(v_owner),(v_other);
  insert into public.profiles(user_id,display_name,crystal_balance)
    values(v_owner,'snow-skin-test',2000)
    on conflict(user_id) do update set crystal_balance=2000;
  insert into public.game_characters(player,name,class,avatar_variant,owner_user_id)
    values('snow-test','snow-sniper','sniper','female',v_owner) returning id into v_sniper;
  insert into public.game_characters(player,name,class,avatar_variant,owner_user_id)
    values('snow-test','snow-warrior','warrior','male',v_owner) returning id into v_warrior;
  select id,price into strict v_item,v_price from public.shop_items where code='sniper_snow_crystal_skin' and active;
  perform set_config('request.jwt.claim.sub',v_owner::text,true);
  -- Cannot equip an unowned item.
  v_rejected:=false;
  begin perform public.equip_avatar_slot(v_sniper,v_item,'skin');
  exception when raise_exception then if sqlerrm<>'item not owned' then raise; end if;v_rejected:=true;end;
  if not v_rejected then raise exception 'unowned skin equip allowed';end if;
  perform public.purchase_shop_item(v_sniper,v_item);
  perform public.purchase_shop_item(v_sniper,v_item);
  if (select count(*) from public.character_inventory where character_id=v_sniper and item_id=v_item)<>2 then raise exception 'duplicate skin purchase failed';end if;
  if (select crystal_balance from public.profiles where user_id=v_owner)<>2000-2*v_price then raise exception 'wallet debit mismatch';end if;
  if (select count(*) from public.coin_ledger where character_id=v_sniper and item_id=v_item)<>2 then raise exception 'ledger mismatch';end if;
  v_equipped:=public.equip_avatar_slot(v_sniper,v_item,'skin');
  if v_equipped->>'skin' is distinct from v_item::text then raise exception 'equip failed';end if;
  -- Inventory and equipment guards also cover direct table writes.
  v_rejected:=false;
  begin perform public.purchase_shop_item(v_warrior,v_item);
  exception when raise_exception then if sqlerrm<>'female sniper required' then raise; end if;v_rejected:=true;end;
  if not v_rejected then raise exception 'wrong class purchase allowed';end if;
  if (select crystal_balance from public.profiles where user_id=v_owner)<>2000-2*v_price then raise exception 'rejected purchase charged wallet';end if;
  v_rejected:=false;
  begin insert into public.character_inventory(character_id,item_id) values(v_warrior,v_item);
  exception when raise_exception then if sqlerrm<>'female sniper required' then raise; end if;v_rejected:=true;end;
  if not v_rejected then raise exception 'wrong class inventory allowed';end if;
  v_rejected:=false;
  begin update public.game_characters set equipped_items=jsonb_build_object('skin',v_item) where id=v_warrior;
  exception when raise_exception then if sqlerrm<>'female sniper required' then raise; end if;v_rejected:=true;end;
  if not v_rejected then raise exception 'wrong class equip allowed';end if;
  perform set_config('request.jwt.claim.sub',v_other::text,true);
  v_rejected:=false;
  begin perform public.purchase_shop_item(v_sniper,v_item);
  exception when raise_exception then if sqlerrm<>'character not found' then raise;end if;v_rejected:=true;end;
  if not v_rejected then raise exception 'other owner purchase allowed';end if;
  v_rejected:=false;
  begin perform public.equip_avatar_slot(v_sniper,null,'skin');
  exception when raise_exception then if sqlerrm<>'character not found' then raise;end if;v_rejected:=true;end;
  if not v_rejected then raise exception 'other owner equip allowed';end if;
  perform set_config('request.jwt.claim.sub',v_owner::text,true);
  v_equipped:=public.equip_avatar_slot(v_sniper,null,'skin');
  if v_equipped ? 'skin' then raise exception 'unequip failed';end if;
  if (select count(*) from public.character_inventory where character_id=v_sniper and item_id=v_item)<>2 then raise exception 'unequip consumed inventory';end if;
  update public.profiles set crystal_balance=0 where user_id=v_owner;
  v_rejected:=false;
  begin perform public.purchase_shop_item(v_sniper,v_item);
  exception when raise_exception then if sqlerrm<>'not enough crystals' then raise;end if;v_rejected:=true;end;
  if not v_rejected then raise exception 'unfunded purchase allowed';end if;
end;
$test$;
select 'PASS: purchase, duplicate copies, wallet/ledger, ownership, eligibility, equip and unequip' as result;
rollback;
