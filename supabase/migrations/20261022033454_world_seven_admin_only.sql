-- Apply the restriction to results written directly and through reward RPCs.
create or replace function public.enforce_story_branch_result() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_owner uuid; v_branch text; v_required text;
begin
  if new.stage like '스토리 7A장 %' or new.stage like '스토리 7B장 %' then
    select owner_user_id into v_owner from public.game_characters where id=new.character_id;
    if auth.uid() is not null and auth.uid()=v_owner
      and exists (select 1 from public.profiles where user_id=auth.uid() and role='admin') then
      return new;
    end if;
    raise exception 'world seven admin access required';
  end if;
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

-- Cover changes to existing results as well as new submissions.
drop trigger enforce_story_branch_result on public.game_scores;
create trigger enforce_story_branch_result before insert or update on public.game_scores
  for each row execute function public.enforce_story_branch_result();
