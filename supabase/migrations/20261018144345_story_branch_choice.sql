-- Account-wide, write-once World 6 choice, shared by characters and learning levels.
create table public.story_branch_choices (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  branch text not null check (branch in ('6A','6B')),
  chosen_at timestamptz not null default now()
);
alter table public.story_branch_choices enable row level security;
revoke all on public.story_branch_choices from public, anon, authenticated;
grant select on public.story_branch_choices to authenticated;
create policy story_branch_read_own on public.story_branch_choices for select to authenticated
  using (user_id = (select auth.uid()));

create function public.choose_story_branch(p_branch text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_branch text;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if p_branch is null or p_branch not in ('6A','6B') then raise exception 'invalid story branch'; end if;
  -- Serialize concurrent choices from different devices for this account.
  perform 1 from public.profiles where user_id=v_user for update;
  if not found then raise exception 'profile unavailable'; end if;
  select branch into v_branch from public.story_branch_choices where user_id=v_user;
  if found then
    if v_branch <> p_branch then raise exception 'story branch is permanent'; end if;
    return v_branch;
  end if;
  if not exists (select 1 from public.game_scores s join public.game_characters c on c.id=s.character_id
    where c.owner_user_id=v_user and s.cleared and s.stage in
      ('스토리 5장 20 · 보랏빛 수정동굴','스토리 5장 20 · 보랏빛 수정동굴 · 초등학생')) then
    raise exception 'world 5 clear required';
  end if;
  insert into public.story_branch_choices(user_id,branch) values(v_user,p_branch);
  return p_branch;
end $$;
revoke all on function public.choose_story_branch(text) from public,anon;
grant execute on function public.choose_story_branch(text) to authenticated;

-- Check the owner of each result, including writes made through reward RPCs.
create function public.enforce_story_branch_result() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_owner uuid; v_branch text; v_required text;
begin
  if new.stage like '스토리 6A장 %' then v_required := '6A';
  elsif new.stage like '스토리 6장 %' or new.stage like '스토리 6B장 %' then v_required := '6B';
  else return new; end if;
  select owner_user_id into v_owner from public.game_characters where id=new.character_id;
  if exists (select 1 from public.profiles where user_id=v_owner and role='admin') then return new; end if;
  select branch into v_branch from public.story_branch_choices where user_id=v_owner;
  if v_branch is distinct from v_required then raise exception 'story branch access denied'; end if;
  return new;
end $$;
revoke all on function public.enforce_story_branch_result() from public,anon,authenticated;
create trigger enforce_story_branch_result before insert or update of stage,character_id on public.game_scores
  for each row execute function public.enforce_story_branch_result();
