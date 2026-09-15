alter table public.profiles
  add column login_id text;

alter table public.profiles
  add constraint profiles_login_id_format_check
  check (
    login_id is null
    or (
      char_length(login_id) between 2 and 20
      and login_id ~ '^[가-힣a-z0-9][가-힣a-z0-9._-]*$'
    )
  );

create unique index profiles_login_id_unique
on public.profiles (lower(login_id))
where login_id is not null;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name, login_id)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), nullif(split_part(new.email, '@', 1), ''), '모험가'),
    nullif(lower(new.raw_user_meta_data ->> 'login_id'), '')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

comment on column public.profiles.login_id is
'User-facing login identifier. Auth email may be an internal deterministic address; do not use this field as authorization data.';
