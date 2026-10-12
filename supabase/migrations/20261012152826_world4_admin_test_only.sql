-- World 4 is in admin-only playtesting. Reject records before rewards are paid.
create or replace function public.enforce_world4_admin_test()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.stage ~ '^스토리 4장 ' and not exists (
    select 1 from public.profiles p
    join public.game_characters c on c.owner_user_id=p.user_id
    where p.user_id=auth.uid() and p.role='admin' and c.id=new.character_id
  ) then
    raise exception 'World 4 is restricted to administrators during testing' using errcode='42501';
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_world4_admin_test() from public, anon, authenticated;
create trigger world4_admin_test_only before insert or update on public.game_scores
for each row execute function public.enforce_world4_admin_test();
