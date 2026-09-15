alter table public.profiles
  add column contact_email text;

alter table public.profiles
  add constraint profiles_contact_email_format_check
  check (
    contact_email is null
    or (
      char_length(contact_email) <= 254
      and contact_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    )
  );

create policy "profiles_update_own_contact"
on public.profiles for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant update (contact_email, updated_at) on public.profiles to authenticated;

comment on column public.profiles.contact_email is
'Optional user-managed contact and recovery email. This is separate from the internal Supabase Auth login email.';
