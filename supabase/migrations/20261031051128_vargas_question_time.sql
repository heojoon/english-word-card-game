-- Allow the longest Vargas budget: ceil(180 / minimum DMG 1) * 4 seconds.
-- Keep ownership, prior-stage, HP, answer-count and atomic reward checks intact.
DO $migration$
DECLARE definition text;
BEGIN
  SELECT pg_get_functiondef('public.claim_vargas_reward(uuid,integer,integer,integer,integer)'::regprocedure) INTO definition;
  IF position('p_duration_ms>120000' IN definition)=0 THEN
    RAISE EXCEPTION 'Unexpected Vargas reward definition';
  END IF;
  EXECUTE replace(definition, 'p_duration_ms>120000', 'p_duration_ms>720000');
END $migration$;
