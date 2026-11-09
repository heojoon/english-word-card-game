-- Linked remote only. All fixtures and ticket consumption roll back.
begin;
do $test$
declare
  v_owner uuid := gen_random_uuid();
  v_male public.game_characters;
  v_female public.game_characters;
  v_ticket bigint;
begin
  insert into auth.users(id,raw_user_meta_data,created_at,updated_at)
    values(v_owner,'{"display_name":"bardtest"}'::jsonb,now(),now());
  perform set_config('request.jwt.claim.sub',v_owner::text,true);
  v_male := public.create_account_character('bardtest','bard','male','violet');
  assert v_male.owner_user_id=v_owner and v_male.class='bard' and v_male.avatar_variant='male';
  begin
    perform public.create_account_character('bardtest','bard','female','violet');
    raise exception 'second character was free';
  exception when others then
    if sqlerrm<>'character creation ticket required' then raise; end if;
  end;
  insert into public.character_creation_tickets(owner_user_id,purchased_by_character_id)
    values(v_owner,v_male.id) returning id into v_ticket;
  v_female := public.create_account_character('bardtest','bard','female','violet');
  assert v_female.owner_user_id=v_owner and v_female.avatar_variant='female';
  assert (select consumed_by_character_id=v_female.id and consumed_at is not null from public.character_creation_tickets where id=v_ticket);
  begin
    perform public.create_account_character('bardtest','sniper','male','violet');
    raise exception 'male sniper accepted';
  exception when others then
    if sqlerrm<>'sniper female variant required' then raise; end if;
  end;
  begin
    perform public.create_account_character('bardtest','invalid','female','violet');
    raise exception 'invalid class accepted';
  exception when others then
    if sqlerrm<>'invalid character class' then raise; end if;
  end;
  perform set_config('request.jwt.claim.sub','',true);
  begin
    perform public.create_account_character('bardtest','bard','female','violet');
    raise exception 'unauthenticated bard accepted';
  exception when others then
    if sqlerrm<>'authentication required' then raise; end if;
  end;
  assert not has_function_privilege('anon','public.create_account_character(text,text,text,text)','execute');
  assert has_function_privilege('authenticated','public.create_account_character(text,text,text,text)','execute');
  assert (select relrowsecurity from pg_class where oid='public.game_characters'::regclass);
end $test$;
rollback;
select 'bard male/female, tickets, auth, class validation and RLS passed' as status;
