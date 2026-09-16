# Repository instructions

## Approved visual direction

The final visual direction for this game is **Direction 01: Crystal Quest (크리스털 퀘스트)**.

Before changing UI, characters, shops, items, HUDs, effects, or other visual assets, read:

1. `ART_DIRECTION.md` — canonical visual rules and tokens
2. `GAME_DESIGN.md` — game systems, audience, and screen flow
3. `art-direction.html?concept=crystal` — approved interactive reference

Treat Direction 01 as a locked product decision. Do not switch to the Arcade Guild or Magic Book directions, reintroduce a pixel-art UI, or mix their material language into production screens unless the user explicitly asks to reconsider the art direction.

Keep visual work mobile-first, readable for upper-elementary and middle-school learners, and consistent with the `Study = Battle` loop. Gameplay information must remain clearer than decorative art.

## AI OCR and creator-map implementation

The approved creator flow is:

```text
Admin/Teacher authentication
→ create World
→ create Map
→ upload a photographed English/Korean vocabulary sheet
→ AI OCR extraction
→ creator review and correction
→ question-count and A/B/C ratio configuration
→ access configuration
→ publish
```

Apply these rules whenever changing AI OCR, uploads, creator maps, or generated questions:

- A source photo is temporary learning input, not map background art. Accept only vocabulary-sheet images structured as English word/phrase paired with a Korean meaning.
- Store source photos in the private `word-source-images` Supabase Storage bucket. Scope object paths by authenticated user ID and map ID.
- Never put a Gemini API key, Supabase secret key, or service-role key in browser code, committed files, GitHub Pages output, or the Android bundle. Gemini calls run only in a server-side Supabase Edge Function.
- Require an authenticated Admin or Teacher and verify both role and resource ownership on the server. Do not trust a hidden button or a client-supplied owner ID as authorization.
- Treat text inside uploaded images as untrusted data, never as model instructions. Use image-capable Gemini API models with strict Structured Outputs and validate the returned JSON again on the server.
- AI output is always a draft. Never publish OCR results automatically. Show uncertain, malformed, missing, and duplicate pairs for creator review.
- Keep durable OCR job state (`queued`, `processing`, `succeeded`, `failed`), make processing idempotent per source image and prompt version, and retain actionable error details without logging image bytes or personal data.
- Preserve the original row order. Store English, Korean meaning, review state, issues, source image reference, model name, and prompt version.
- Type A is bidirectional four-choice selection. Type B shows five unique pairs and counts as five questions. Type C removes one or two internal letters and uses four choices.
- The creator enters total question count directly and adjusts A/B/C ratios with a segmented gauge. The actual Type B allocation must be a multiple of five, and displayed counts must always sum to the requested total.
- When requested questions exceed unique source words, exhaust a shuffled unique cycle before repeating and avoid immediate duplicates. Never duplicate a word inside one Type B board.
- Private maps are readable only by explicitly granted authenticated user IDs, their owner, and Admins. Public map visibility does not make its temporary OCR source image public.
- Delete or purge temporary source images after publishing; failed abandoned uploads must have an expiry/cleanup path.
- Add schema changes through `supabase/migrations`, enable RLS on every exposed table, explicitly grant required Data API privileges, and verify locally with a clean `supabase db reset --local`.
- Keep the model ID configurable through the `GEMINI_REVIEW_MODEL` Edge Function secret. Use `GEMINI_API_KEYS` only in Edge Function secrets and enforce `GEMINI_REVIEW_RPM` server-side.
