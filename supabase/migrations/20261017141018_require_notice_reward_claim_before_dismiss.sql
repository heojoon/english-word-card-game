-- Serialize dismissal with claiming so attached rewards cannot be abandoned.
create or replace function game_notice_private.dismiss_game_notice(p_notice_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare
  v_receipt public.game_notice_receipts%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into v_receipt from public.game_notice_receipts
    where notice_id=p_notice_id and user_id=auth.uid() for update;
  if not found then raise exception 'notice not found'; end if;
  if v_receipt.claimed_at is null and exists(
    select 1 from public.game_notices where id=p_notice_id and jsonb_array_length(rewards)>0
  ) then raise exception 'claim notice rewards first'; end if;
  update public.game_notice_receipts set dismissed_at=coalesce(dismissed_at,now())
    where notice_id=p_notice_id and user_id=auth.uid();
end $$;
