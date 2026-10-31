-- Allow ceil(180 / minimum DMG 1) * 6 seconds for Vargas rewards.
-- Preserve ownership, progression, HP, answer-count and atomic reward checks.
DO $migration$
DECLARE definition text;
BEGIN
  SELECT pg_get_functiondef('public.claim_vargas_reward(uuid,integer,integer,integer,integer)'::regprocedure) INTO definition;
  IF position('p_duration_ms>720000' IN definition)=0 THEN
    RAISE EXCEPTION 'Unexpected Vargas reward definition';
  END IF;
  EXECUTE replace(definition, 'p_duration_ms>720000', 'p_duration_ms>1080000');
END $migration$;
