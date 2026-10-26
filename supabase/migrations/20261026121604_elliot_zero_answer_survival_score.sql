-- Survival-only clears can have zero answers; game_scores.total must remain positive.
DO $$
DECLARE definition text;
BEGIN
  SELECT pg_get_functiondef('public.claim_elliot_reward(uuid,integer,integer,boolean,integer,integer)'::regprocedure) INTO definition;
  definition := replace(definition, 'case when p_cleared then p_correct else greatest(500,p_correct+1) end', 'case when p_cleared then greatest(1,p_correct) else greatest(500,p_correct+1) end');
  EXECUTE definition;
END $$;
