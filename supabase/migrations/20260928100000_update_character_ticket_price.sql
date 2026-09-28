-- Character creation tickets now cost 100 crystals.
-- Keep the historical 1,000-crystal value valid for existing ticket rows.
alter table public.character_creation_tickets
  alter column price_paid set default 100;

alter table public.character_creation_tickets
  drop constraint if exists character_creation_tickets_price_paid_check;

alter table public.character_creation_tickets
  add constraint character_creation_tickets_price_paid_check
  check (price_paid in (100, 1000));

create or replace function public.purchase_character_creation_ticket(
  p_payer_character_id uuid
)
returns table(ticket_id bigint, new_balance integer, available_tickets integer)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_balance integer;
  v_ticket_id bigint;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if not exists (
    select 1 from public.game_characters c
    where c.id = p_payer_character_id and c.owner_user_id = v_user_id
  ) then raise exception 'character not found'; end if;

  select p.crystal_balance into v_balance
  from public.profiles p
  where p.user_id = v_user_id
  for update;

  if v_balance is null then raise exception 'profile not found'; end if;
  if v_balance < 100 then raise exception 'not enough crystals'; end if;

  update public.profiles
  set crystal_balance = crystal_balance - 100, updated_at = now()
  where user_id = v_user_id
  returning crystal_balance into v_balance;

  insert into public.character_creation_tickets (
    owner_user_id, purchased_by_character_id, price_paid
  ) values (v_user_id, p_payer_character_id, 100)
  returning id into v_ticket_id;

  insert into public.coin_ledger(character_id, amount, reason)
  values (p_payer_character_id, -100, 'character_creation_ticket');

  return query
  select v_ticket_id, v_balance, count(*)::integer
  from public.character_creation_tickets t
  where t.owner_user_id = v_user_id and t.consumed_by_character_id is null;
end;
$function$;
