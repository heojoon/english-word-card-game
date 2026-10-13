-- Release World 4 to all players. Existing ownership/RLS and reward validation remain.
drop trigger if exists world4_admin_test_only on public.game_scores;
drop function if exists public.enforce_world4_admin_test();
