-- Continue each permanent World 6 story branch into its matching World 7 branch.
create or replace function public.enforce_story_branch_result() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
  v_branch text;
  v_required text;
  v_previous_stage text;
begin
  if new.stage like '스토리 7A장 %' then
    v_required := '6A';
    v_previous_stage := '스토리 6A장 20 · 반전세계';
  elsif new.stage like '스토리 7B장 %' or new.stage like '스토리 7C장 %' then
    v_required := '6B';
    v_previous_stage := '스토리 6장 20 · 왕국수도로 가는 길';
  elsif new.stage like '스토리 6A장 %' then
    v_required := '6A';
  elsif new.stage like '스토리 6장 %' or new.stage like '스토리 6B장 %' then
    v_required := '6B';
  else
    return new;
  end if;

  select owner_user_id into v_owner from public.game_characters where id = new.character_id;
  if v_previous_stage is not null and (auth.uid() is null or auth.uid() <> v_owner) then
    raise exception 'world seven owner access required';
  end if;
  if exists (select 1 from public.profiles where user_id = v_owner and role = 'admin') then
    return new;
  end if;
  select branch into v_branch from public.story_branch_choices where user_id = v_owner;
  if v_branch is distinct from v_required then
    raise exception 'story branch access denied';
  end if;
  if v_previous_stage is not null and not exists (
    select 1 from public.game_scores s
    join public.game_characters c on c.id = s.character_id
    where c.owner_user_id = v_owner and s.cleared
      and s.stage in (v_previous_stage, v_previous_stage || ' · 초등학생')
  ) then
    raise exception 'world six clear required';
  end if;
  return new;
end $$;
revoke all on function public.enforce_story_branch_result() from public, anon, authenticated;
