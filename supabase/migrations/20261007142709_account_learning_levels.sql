-- Existing accounts and vocabulary maps are middle-school content.
alter table public.profiles add column learning_level text not null default 'middle'
  check (learning_level in ('elementary', 'middle'));
alter table public.maps add column learning_level text not null default 'middle'
  check (learning_level in ('elementary', 'middle'));
comment on column public.profiles.learning_level is 'Learning content level, independent of character XP and account role. Only admins can change it after signup.';
comment on column public.maps.learning_level is 'Target learning level. Existing published and draft maps are middle-school maps.';

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_level text := coalesce(new.raw_user_meta_data ->> 'learning_level', 'middle');
begin
  if v_level not in ('elementary', 'middle') then raise exception 'unsupported learning level'; end if;
  insert into public.profiles(user_id, display_name, login_id, learning_level)
  values(new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), nullif(split_part(new.email, '@', 1), ''), '모험가'),
    nullif(lower(new.raw_user_meta_data ->> 'login_id'), ''), v_level)
  on conflict(user_id) do nothing;
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;

-- A role check against stored profiles, never editable auth metadata.
create or replace function public.admin_set_learning_level(p_user_id uuid, p_learning_level text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.profiles where user_id=auth.uid() and role='admin') then
    raise exception 'administrator required' using errcode='42501';
  end if;
  if p_learning_level is null or p_learning_level not in ('elementary','middle') then raise exception 'unsupported learning level'; end if;
  update public.profiles set learning_level=p_learning_level, updated_at=now() where user_id=p_user_id;
  if not found then raise exception 'profile not found'; end if;
end;
$$;
revoke all on function public.admin_set_learning_level(uuid,text) from public, anon;
grant execute on function public.admin_set_learning_level(uuid,text) to authenticated;

-- Preserve all existing visibility/ownership policies and additionally separate
-- student content levels. Owners and admins can still manage both catalogs.
create policy maps_read_learning_level on public.maps as restrictive
for select to authenticated
using (
  owner_user_id=(select auth.uid())
  or exists(select 1 from public.profiles p where p.user_id=(select auth.uid())
    and (p.role='admin' or p.learning_level=maps.learning_level))
);
