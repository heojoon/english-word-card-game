alter table public.game_characters
  add column if not exists avatar_variant text;

update public.game_characters
set avatar_variant = case
  when class in ('pugilist', 'ranger') then 'female'
  else 'male'
end
where avatar_variant is null;

alter table public.game_characters
  alter column avatar_variant set default 'male',
  alter column avatar_variant set not null;

alter table public.game_characters
  drop constraint if exists game_characters_avatar_variant_check;

alter table public.game_characters
  add constraint game_characters_avatar_variant_check
  check (avatar_variant in ('male', 'female'));
