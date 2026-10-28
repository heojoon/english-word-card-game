-- Entry consumes each hidden stage, even when the run is abandoned or unfinished.
-- Existing run history counts as an entry. Story unlocks and rewards stay intact.
create function public.world_five_hidden_status(p_character_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_owner uuid; v_unlocked boolean; v_used jsonb;
begin
  v_unlocked:=public.world_five_hidden_access(p_character_id);
  select owner_user_id into v_owner from public.game_characters where id=p_character_id;
  select coalesce(jsonb_agg(distinct r.kind),'[]'::jsonb) into v_used
  from public.world_five_hidden_runs r join public.game_characters c on c.id=r.character_id
  where (v_owner is not null and c.owner_user_id=v_owner)
    or (v_owner is null and c.id=p_character_id);
  return jsonb_build_object('unlocked',v_unlocked,'used',v_used);
end $$;
revoke all on function public.world_five_hidden_status(uuid) from public;
grant execute on function public.world_five_hidden_status(uuid) to anon,authenticated;

create or replace function public.begin_world_five_hidden(p_character_id uuid,p_kind text) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_owner uuid;
begin
  if not public.world_five_hidden_access(p_character_id) then raise exception 'hidden stage locked'; end if;
  if p_kind is null or p_kind not in ('fever','king') then raise exception 'invalid hidden stage'; end if;
  select owner_user_id into v_owner from public.game_characters where id=p_character_id;
  -- Serialize entries across every character of the same account.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('world-five-hidden:'||coalesce(v_owner,p_character_id)::text,0));
  if (public.world_five_hidden_status(p_character_id)->'used') ? p_kind then
    raise exception 'hidden stage already entered';
  end if;
  perform 1 from public.game_characters c where c.id=p_character_id for update;
  update public.world_five_hidden_runs set abandoned=true where character_id=p_character_id and game_score_id is null and not abandoned;
  insert into public.world_five_hidden_runs(character_id,kind) values(p_character_id,p_kind) returning id into v_id;
  return v_id;
end $$;
