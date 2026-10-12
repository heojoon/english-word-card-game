-- Add the exact female sniper identity while preserving existing roster/ticket ownership rules.
alter table public.game_characters drop constraint game_characters_class_check;
alter table public.game_characters add constraint game_characters_class_check
  check (class in ('warrior', 'mage', 'pugilist', 'ranger', 'sniper'));
alter table public.game_characters add constraint game_characters_sniper_variant_check
  check (class <> 'sniper' or avatar_variant = 'female');

create or replace function public.create_account_character(
  p_name text,
  p_class text,
  p_avatar_variant text,
  p_accent text
)
returns public.game_characters
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_player text;
  v_owned_count integer;
  v_ticket_id bigint;
  v_character public.game_characters;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if p_name is null or char_length(btrim(p_name)) not between 1 and 16 then
    raise exception 'invalid character name';
  end if;
  if p_class is null or p_class not in ('warrior', 'mage', 'pugilist', 'ranger', 'sniper') then
    raise exception 'invalid character class';
  end if;
  if p_avatar_variant is null or p_avatar_variant not in ('male', 'female') then
    raise exception 'invalid avatar variant';
  end if;
  if p_class = 'sniper' and p_avatar_variant <> 'female' then
    raise exception 'sniper female variant required';
  end if;
  if p_accent not in ('violet', 'red', 'blue', 'green', 'gold') then
    raise exception 'invalid accent';
  end if;

  -- Serialize roster creation for this account. The profile row always exists
  -- for authenticated users through the auth.users trigger.
  select left(coalesce(nullif(p.login_id, ''), nullif(p.display_name, ''), 'adventurer'), 12)
  into v_player
  from public.profiles p
  where p.user_id = v_user_id
  for update;

  if v_player is null then raise exception 'profile not found'; end if;

  select count(*)::integer into v_owned_count
  from public.game_characters c
  where c.owner_user_id = v_user_id;

  if v_owned_count > 0 then
    select t.id into v_ticket_id
    from public.character_creation_tickets t
    where t.owner_user_id = v_user_id
      and t.consumed_by_character_id is null
    order by t.purchased_at, t.id
    limit 1
    for update;
    if v_ticket_id is null then raise exception 'character creation ticket required'; end if;
  end if;

  insert into public.game_characters (
    owner_user_id, player, name, class, avatar_variant, accent, coins
  ) values (
    v_user_id, v_player, btrim(p_name), p_class, p_avatar_variant, p_accent, 0
  ) returning * into v_character;

  if v_ticket_id is not null then
    update public.character_creation_tickets
    set consumed_by_character_id = v_character.id, consumed_at = now()
    where id = v_ticket_id;
  end if;

  return v_character;
end;
$function$;

revoke all on function public.create_account_character(text, text, text, text) from public, anon;
grant execute on function public.create_account_character(text, text, text, text) to authenticated;
