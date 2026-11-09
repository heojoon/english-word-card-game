-- Bard starts with its healing active and has no legacy World 8 skill to unlock.
-- Patch only the unlock insert; preserve the live reward/ownership/time checks.
do $patch$
declare
  v_definition text := pg_get_functiondef('public.claim_vargas_reward(uuid,integer,integer,integer,integer)'::regprocedure);
  v_insert constant text := $insert$  insert into public.character_active_skill_unlocks(character_id,class_code,source_game_score_id)
    values(p_character_id,v_class,v_score) on conflict(character_id) do nothing;$insert$;
begin
  if strpos(v_definition,v_insert)=0 then
    raise exception 'expected Vargas skill unlock insert not found';
  end if;
  execute replace(v_definition,v_insert,
    '  if v_class in (''warrior'',''mage'',''pugilist'',''ranger'',''sniper'') then' || E'\n' || v_insert || E'\n' || '  end if;');
end $patch$;
