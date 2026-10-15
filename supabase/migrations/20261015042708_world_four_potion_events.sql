-- World 4 story discoveries are shared across characters and learning levels.
create table public.world_four_potion_rewards (
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  milestone integer not null check (milestone in (4,8,12,16)),
  character_id uuid references public.game_characters(id) on delete set null,
  potion_count integer not null default 3 check (potion_count=3),
  created_at timestamptz not null default now(),
  primary key(owner_user_id,milestone)
);
alter table public.world_four_potion_rewards enable row level security;
revoke all on public.world_four_potion_rewards from public,anon,authenticated;
grant select on public.world_four_potion_rewards to authenticated;
create policy "Owners read their World 4 discoveries"
  on public.world_four_potion_rewards for select to authenticated
  using (owner_user_id=(select auth.uid()));

create or replace function public.claim_world_four_potion_event(p_character_id uuid,p_milestone integer)
returns jsonb language plpgsql security definer set search_path='' as $function$
declare
  v_owner uuid;
  v_claimed boolean;
  v_inventory jsonb;
begin
  if p_milestone is null or p_milestone not in (4,8,12,16) then
    raise exception 'invalid milestone';
  end if;
  select c.owner_user_id into v_owner from public.game_characters c
    where c.id=p_character_id for update;
  if not found or v_owner is null or auth.uid() is distinct from v_owner then
    raise exception 'character not found';
  end if;
  -- Serialize rewards across every character belonging to this account.
  perform 1 from public.profiles p where p.user_id=v_owner for update;
  if not found then raise exception 'account unavailable'; end if;
  if exists(
    select 1 from generate_series(1,p_milestone) as required(stage_number)
    where not exists(
      select 1 from public.game_scores s
      join public.game_characters c on c.id=s.character_id
      where c.owner_user_id=v_owner and s.cleared
        and s.stage in (
          format('스토리 4장 %s · 환각의 숲과 버려진 성',required.stage_number),
          format('스토리 4장 %s · 환각의 숲과 버려진 성 · 초등학생',required.stage_number)
        )
    )
  ) then raise exception 'milestone not cleared'; end if;
  insert into public.world_four_potion_rewards(owner_user_id,milestone,character_id)
    values(v_owner,p_milestone,p_character_id) on conflict do nothing;
  v_claimed:=found;
  if v_claimed then
    insert into public.story_potion_inventory(character_id,red_potion_count)
      values(p_character_id,3)
      on conflict(character_id) do update set
        red_potion_count=public.story_potion_inventory.red_potion_count+3;
  end if;
  select to_jsonb(i) into v_inventory from public.get_story_potion_inventory(p_character_id) i;
  return jsonb_build_object('milestone',p_milestone,'already_claimed',not v_claimed,
    'potion_count',case when v_claimed then 3 else 0 end,'inventory',v_inventory);
end $function$;
revoke all on function public.claim_world_four_potion_event(uuid,integer) from public,anon;
grant execute on function public.claim_world_four_potion_event(uuid,integer) to authenticated;
