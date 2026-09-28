alter table public.reward_redemptions
  add column fulfilled_at timestamptz;

-- Older completed rows have no recorded fulfillment time.
update public.reward_redemptions
set fulfilled_at = created_at
where status = 'fulfilled' and fulfilled_at is null;

create index reward_redemptions_recent_fulfilled_idx
  on public.reward_redemptions (character_id, fulfilled_at desc)
  where status = 'fulfilled';

create or replace function public.fulfill_reward_redemption(p_redemption_id bigint)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_fulfilled_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  update public.reward_redemptions r
  set status = 'fulfilled', fulfilled_at = now()
  from public.game_characters c
  where r.id = p_redemption_id
    and c.id = r.character_id
    and c.owner_user_id = auth.uid()
    and r.status in ('pending', 'approved')
  returning r.fulfilled_at into v_fulfilled_at;

  if v_fulfilled_at is null then
    raise exception 'reward request not found or already completed';
  end if;

  return v_fulfilled_at;
end;
$function$;

revoke all on function public.fulfill_reward_redemption(bigint) from public, anon;
grant execute on function public.fulfill_reward_redemption(bigint) to authenticated;

-- Keep completed requests for one month. Unfulfilled requests remain until handled.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule(
  'wordoria-reward-history-cleanup',
  '0 3 * * *',
  $$delete from public.reward_redemptions
    where status = 'fulfilled'
      and fulfilled_at < now() - interval '30 days'$$
);
