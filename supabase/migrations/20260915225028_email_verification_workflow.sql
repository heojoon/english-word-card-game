alter table public.profiles
  add column contact_email_active boolean not null default false,
  add column contact_email_verified_at timestamptz,
  add column email_reward_granted_at timestamptz,
  add column email_reward_crystals integer not null default 0
    check (email_reward_crystals >= 0);

create unique index profiles_active_contact_email_unique
on public.profiles (lower(contact_email))
where contact_email_active and contact_email is not null;

create unique index profiles_verified_contact_email_owner_unique
on public.profiles (lower(contact_email))
where contact_email_verified_at is not null and contact_email is not null;

drop policy if exists "profiles_update_own_contact" on public.profiles;
revoke update (contact_email, updated_at) on public.profiles from authenticated;

create table public.email_verification_challenges (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null check (
    char_length(email) <= 254
    and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  code_mac text not null,
  attempts smallint not null default 0 check (attempts between 0 and 5),
  expires_at timestamptz not null,
  resend_available_at timestamptz not null,
  send_window_started_at timestamptz not null,
  send_count smallint not null default 1 check (send_count between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.email_verification_challenges enable row level security;

revoke all on public.email_verification_challenges from public, anon, authenticated;
grant all on public.email_verification_challenges to service_role;

comment on table public.email_verification_challenges is
'Server-only, short-lived profile email verification challenges. Codes are stored as keyed MACs, never plaintext.';

comment on column public.profiles.contact_email_active is
'Whether the retained verified contact email is currently linked and usable.';

comment on column public.profiles.email_reward_crystals is
'One-time account-level crystal reward earned by completing profile email verification.';
