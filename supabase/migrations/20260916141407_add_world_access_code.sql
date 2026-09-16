create or replace function private.generate_world_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
begin
  loop
    candidate := '';
    for position in 1..4 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1);
    end loop;

    -- Keep codes easy to distinguish from names and guarantee the requested mix.
    if candidate ~ '[A-Z]' and candidate ~ '[0-9]'
      and not exists (select 1 from public.worlds where world_code = candidate)
    then
      return candidate;
    end if;
  end loop;
end;
$$;

revoke all on function private.generate_world_code() from public, anon, authenticated;

alter table public.worlds
  add column world_code text;

update public.worlds
set world_code = private.generate_world_code()
where world_code is null;

alter table public.worlds
  alter column world_code set not null,
  add constraint worlds_world_code_format check (world_code ~ '^(?=.*[A-Z])(?=.*[0-9])[A-Z0-9]{4}$'),
  add constraint worlds_world_code_unique unique (world_code);

create or replace function private.assign_world_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.world_code := private.generate_world_code();
  return new;
end;
$$;

revoke all on function private.assign_world_code() from public, anon, authenticated;

create trigger worlds_assign_world_code
before insert on public.worlds
for each row execute function private.assign_world_code();

comment on column public.worlds.world_code is 'Public-facing four-character lookup code containing uppercase letters and digits.';
