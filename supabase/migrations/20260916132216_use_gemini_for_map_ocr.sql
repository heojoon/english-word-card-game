alter table public.ocr_jobs
  drop constraint if exists ocr_jobs_source_image_id_key;

alter table public.ocr_jobs
  alter column prompt_version set default 'gemini-word-pairs-v2';

alter table public.ocr_jobs
  add constraint ocr_jobs_source_prompt_version_key unique (source_image_id, prompt_version);

alter table public.map_words
  drop constraint if exists map_words_english_check,
  drop constraint if exists map_words_korean_check;

alter table public.map_words
  add constraint map_words_english_check check (char_length(english) between 0 and 120),
  add constraint map_words_korean_check check (char_length(korean) between 0 and 240),
  add constraint map_words_approved_pair_present_check check (
    review_status <> 'approved'
    or (char_length(btrim(english)) > 0 and char_length(btrim(korean)) > 0)
  );

comment on constraint ocr_jobs_source_prompt_version_key on public.ocr_jobs is
  'Makes Gemini OCR processing idempotent for each source image and prompt version.';

comment on constraint map_words_approved_pair_present_check on public.map_words is
  'OCR drafts may retain missing values for review; approved pairs must contain both English and Korean.';
