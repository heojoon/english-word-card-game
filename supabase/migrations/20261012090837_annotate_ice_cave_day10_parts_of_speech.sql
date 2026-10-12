-- Annotate only middle-school Pink Ice Cave day.10, based on its saved meanings.
-- book is a verb here; rescue includes noun and verb senses; unlike is a preposition.
-- Keep the existing Korean text and word order. Allow reapplication, reject stale edits.
DO $migration$
DECLARE
  matched integer;
BEGIN
  WITH annotations(english, original_korean, labeled_korean) AS (VALUES
    ('proportion', '비율,부분', '[명] 비율,부분'),
    ('bind', '묶다', '[동] 묶다'),
    ('giraffe', '기린', '[명] 기린'),
    ('weapon', '무기', '[명] 무기'),
    ('deal', '다루다', '[동] 다루다'),
    ('enlarge', '확대하다, 확장하다', '[동] 확대하다, 확장하다'),
    ('role', '역할', '[명] 역할'),
    ('diverse', '다양한', '[형] 다양한'),
    ('humanism', '인본주의,휴머니즘', '[명] 인본주의,휴머니즘'),
    ('folk', '(복수취급) 사람들', '[명] (복수취급) 사람들'),
    ('surround', '둘러싸다, 에워싸다', '[동] 둘러싸다, 에워싸다'),
    ('valid', '유효한, 타당한', '[형] 유효한, 타당한'),
    ('deceive', '속이다,기만하다', '[동] 속이다,기만하다'),
    ('emphasize', '강조하다', '[동] 강조하다'),
    ('symptom', '증상', '[명] 증상'),
    ('quantity', '양, 수량, 분량', '[명] 양, 수량, 분량'),
    ('pass away', '사망하다,돌아가시다', '[동] 사망하다,돌아가시다'),
    ('obtain', '얻다', '[동] 얻다'),
    ('unlike', '~와 다른', '[전] ~와 다른'),
    ('involve', '수반하다, 포함하다', '[동] 수반하다, 포함하다'),
    ('figurative', '비유적인', '[형] 비유적인'),
    ('appropriate', '적절한', '[형] 적절한'),
    ('maintain', '유지하다', '[동] 유지하다'),
    ('absolute', '절대의, 절대적인', '[형] 절대의, 절대적인'),
    ('preserve', '보호하다, 보존하다', '[동] 보호하다, 보존하다'),
    ('status', '신분, 지위, 자격', '[명] 신분, 지위, 자격'),
    ('book', '예약하다', '[동] 예약하다'),
    ('impressive', '인상적인, 감명 깊은', '[형] 인상적인, 감명 깊은'),
    ('chest', '가슴,흉부', '[명] 가슴,흉부'),
    ('rescue', '구조, 구하다, 구조하다', '[명] 구조, [동] 구하다, 구조하다')
  )
  UPDATE public.map_words AS word
  SET korean = annotations.labeled_korean
  FROM annotations
  WHERE word.map_id = 'ef934aed-194d-47a4-a900-428aa6499c13'::uuid
    AND word.english = annotations.english
    AND word.korean IN (annotations.original_korean, annotations.labeled_korean);

  GET DIAGNOSTICS matched = ROW_COUNT;
  IF matched <> 30 THEN
    RAISE EXCEPTION 'Expected 30 matching day.10 words; found %. No changes applied.', matched;
  END IF;
END;
$migration$;
