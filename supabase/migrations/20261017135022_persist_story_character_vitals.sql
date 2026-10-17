-- Persistent Story HP/MP, scoped to the authenticated character owner.
create table public.story_character_vitals (
  character_id uuid primary key references public.game_characters(id) on delete cascade,
  hp integer not null check (hp >= 0),
  mp integer not null check (mp >= 0)
);
alter table public.story_character_vitals enable row level security;
revoke all on public.story_character_vitals from public, anon, authenticated;
grant select, insert, update on public.story_character_vitals to authenticated;
create policy "Owners read Story vitals" on public.story_character_vitals
  for select to authenticated using (exists (
    select 1 from public.game_characters c
    where c.id=character_id and c.owner_user_id=(select auth.uid())
  ));
create policy "Owners create Story vitals" on public.story_character_vitals
  for insert to authenticated with check (exists (
    select 1 from public.game_characters c
    where c.id=character_id and c.owner_user_id=(select auth.uid())
  ));
create policy "Owners update Story vitals" on public.story_character_vitals
  for update to authenticated using (exists (
    select 1 from public.game_characters c
    where c.id=character_id and c.owner_user_id=(select auth.uid())
  )) with check (exists (
    select 1 from public.game_characters c
    where c.id=character_id and c.owner_user_id=(select auth.uid())
  ));
