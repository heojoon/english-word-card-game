create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '모험가' check (char_length(display_name) between 1 and 40),
  role text not null default 'student' check (role in ('admin', 'teacher', 'student')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), nullif(split_part(new.email, '@', 1), ''), '모험가')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row execute function private.handle_new_user();

insert into public.profiles (user_id, display_name)
select
  id,
  coalesce(nullif(raw_user_meta_data ->> 'display_name', ''), nullif(split_part(email, '@', 1), ''), '모험가')
from auth.users
on conflict (user_id) do nothing;

create table public.worlds (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  description text not null default '' check (char_length(description) <= 240),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint worlds_id_owner_unique unique (id, owner_user_id)
);

create table public.maps (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  description text not null default '' check (char_length(description) <= 240),
  visibility text not null default 'private' check (visibility in ('public', 'private')),
  status text not null default 'draft' check (status in ('draft', 'processing', 'review', 'published', 'archived')),
  total_question_count integer not null default 30 check (total_question_count between 1 and 500),
  type_a_ratio integer not null default 40 check (type_a_ratio between 0 and 100),
  type_b_ratio integer not null default 30 check (type_b_ratio between 0 and 100),
  type_c_ratio integer not null default 30 check (type_c_ratio between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint maps_quiz_ratio_sum check (type_a_ratio + type_b_ratio + type_c_ratio = 100),
  constraint maps_id_owner_unique unique (id, owner_user_id),
  constraint maps_world_owner_fk
    foreign key (world_id, owner_user_id) references public.worlds(id, owner_user_id) on delete cascade
);

create table public.map_access_grants (
  map_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  granted_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (map_id, user_id),
  constraint map_access_grants_map_owner_fk
    foreign key (map_id, owner_user_id) references public.maps(id, owner_user_id) on delete cascade
);

create table public.map_source_images (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.maps(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  bucket_id text not null default 'word-source-images' check (bucket_id = 'word-source-images'),
  object_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  file_size integer not null check (file_size between 1 and 6291456),
  status text not null default 'uploaded' check (status in ('uploaded', 'processing', 'review', 'failed', 'purged')),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ocr_jobs (
  id uuid primary key default gen_random_uuid(),
  source_image_id uuid not null unique references public.map_source_images(id) on delete cascade,
  map_id uuid not null references public.maps(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'processing', 'succeeded', 'failed')),
  attempts integer not null default 0 check (attempts between 0 and 10),
  model text,
  prompt_version text not null default 'word-pairs-v1',
  error_code text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.map_words (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.maps(id) on delete cascade,
  source_image_id uuid references public.map_source_images(id) on delete set null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  row_order integer not null check (row_order > 0),
  english text not null check (char_length(english) between 1 and 120),
  korean text not null check (char_length(korean) between 1 and 240),
  needs_review boolean not null default true,
  issues jsonb not null default '[]'::jsonb check (jsonb_typeof(issues) = 'array'),
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_image_id, row_order)
);

create index worlds_owner_user_id_idx on public.worlds(owner_user_id);
create index maps_world_id_idx on public.maps(world_id);
create index maps_owner_user_id_idx on public.maps(owner_user_id);
create index maps_visibility_status_idx on public.maps(visibility, status);
create index map_access_grants_user_id_idx on public.map_access_grants(user_id);
create index map_source_images_map_id_idx on public.map_source_images(map_id);
create index ocr_jobs_owner_status_idx on public.ocr_jobs(owner_user_id, status);
create index map_words_map_id_order_idx on public.map_words(map_id, row_order);

alter table public.worlds enable row level security;
alter table public.maps enable row level security;
alter table public.map_access_grants enable row level security;
alter table public.map_source_images enable row level security;
alter table public.ocr_jobs enable row level security;
alter table public.map_words enable row level security;

create policy "profiles_read_own"
on public.profiles for select to authenticated
using ((select auth.uid()) = user_id);

create policy "worlds_read_accessible"
on public.worlds for select to authenticated
using (
  owner_user_id = (select auth.uid())
  or exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.role = 'admin')
  or exists (
    select 1 from public.maps m
    where m.world_id = worlds.id
      and m.status = 'published'
      and (
        m.visibility = 'public'
        or exists (
          select 1 from public.map_access_grants g
          where g.map_id = m.id and g.user_id = (select auth.uid())
        )
      )
  )
);

create policy "worlds_create_by_creator"
on public.worlds for insert to authenticated
with check (
  owner_user_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.user_id = (select auth.uid()) and p.role in ('admin', 'teacher')
  )
);

create policy "worlds_update_by_owner_or_admin"
on public.worlds for update to authenticated
using (
  owner_user_id = (select auth.uid())
  or exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.role = 'admin')
)
with check (
  owner_user_id = (select auth.uid())
  or exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.role = 'admin')
);

create policy "worlds_delete_by_owner_or_admin"
on public.worlds for delete to authenticated
using (
  owner_user_id = (select auth.uid())
  or exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.role = 'admin')
);

create policy "maps_read_accessible"
on public.maps for select to authenticated
using (
  owner_user_id = (select auth.uid())
  or exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.role = 'admin')
  or (status = 'published' and visibility = 'public')
  or (
    status = 'published'
    and exists (
      select 1 from public.map_access_grants g
      where g.map_id = maps.id and g.user_id = (select auth.uid())
    )
  )
);

create policy "maps_create_by_world_owner"
on public.maps for insert to authenticated
with check (
  owner_user_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.user_id = (select auth.uid()) and p.role in ('admin', 'teacher')
  )
);

create policy "maps_update_by_owner_or_admin"
on public.maps for update to authenticated
using (
  owner_user_id = (select auth.uid())
  or exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.role = 'admin')
)
with check (
  owner_user_id = (select auth.uid())
  or exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.role = 'admin')
);

create policy "maps_delete_by_owner_or_admin"
on public.maps for delete to authenticated
using (
  owner_user_id = (select auth.uid())
  or exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.role = 'admin')
);

create policy "map_grants_read_related"
on public.map_access_grants for select to authenticated
using (
  user_id = (select auth.uid())
  or owner_user_id = (select auth.uid())
  or exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.role = 'admin')
);

create policy "map_grants_insert_by_owner_or_admin"
on public.map_access_grants for insert to authenticated
with check (
  granted_by = (select auth.uid())
  and (
    owner_user_id = (select auth.uid())
    or exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.role = 'admin')
  )
);

create policy "map_grants_delete_by_owner_or_admin"
on public.map_access_grants for delete to authenticated
using (
  owner_user_id = (select auth.uid())
  or exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.role = 'admin')
);

create policy "map_sources_manage_by_owner_or_admin"
on public.map_source_images for all to authenticated
using (
  owner_user_id = (select auth.uid())
  or exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.role = 'admin')
)
with check (
  owner_user_id = (select auth.uid())
  and exists (
    select 1 from public.maps m
    where m.id = map_id and m.owner_user_id = (select auth.uid())
  )
);

create policy "ocr_jobs_read_by_owner_or_admin"
on public.ocr_jobs for select to authenticated
using (
  owner_user_id = (select auth.uid())
  or exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.role = 'admin')
);

create policy "map_words_read_accessible"
on public.map_words for select to authenticated
using (
  owner_user_id = (select auth.uid())
  or exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.role = 'admin')
  or exists (select 1 from public.maps m where m.id = map_id)
);

create policy "map_words_insert_by_owner_or_admin"
on public.map_words for insert to authenticated
with check (
  (
    owner_user_id = (select auth.uid())
    and exists (select 1 from public.maps m where m.id = map_id and m.owner_user_id = (select auth.uid()))
  )
  or exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.role = 'admin')
);

create policy "map_words_update_by_owner_or_admin"
on public.map_words for update to authenticated
using (
  owner_user_id = (select auth.uid())
  or exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.role = 'admin')
)
with check (
  (
    owner_user_id = (select auth.uid())
    and exists (select 1 from public.maps m where m.id = map_id and m.owner_user_id = (select auth.uid()))
  )
  or exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.role = 'admin')
);

create policy "map_words_delete_by_owner_or_admin"
on public.map_words for delete to authenticated
using (
  owner_user_id = (select auth.uid())
  or exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.role = 'admin')
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'word-source-images',
  'word-source-images',
  false,
  6291456,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "creator_source_images_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'word-source-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.profiles p
    where p.user_id = (select auth.uid()) and p.role in ('admin', 'teacher')
  )
);

create policy "creator_source_images_read"
on storage.objects for select to authenticated
using (
  bucket_id = 'word-source-images'
  and (
    owner_id = (select auth.uid())::text
    or exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.role = 'admin')
  )
);

create policy "creator_source_images_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'word-source-images'
  and (
    owner_id = (select auth.uid())::text
    or exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.role = 'admin')
  )
);

grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.worlds to authenticated;
grant select, insert, update, delete on public.maps to authenticated;
grant select, insert, delete on public.map_access_grants to authenticated;
grant select, insert, update, delete on public.map_source_images to authenticated;
grant select on public.ocr_jobs to authenticated;
grant select, insert, update, delete on public.map_words to authenticated;

revoke all on public.profiles, public.worlds, public.maps, public.map_access_grants,
  public.map_source_images, public.ocr_jobs, public.map_words from anon;
