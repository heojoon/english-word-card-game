# Repository instructions

## Approved visual direction

The final visual direction for this game is **Direction 01: Crystal Quest (크리스털 퀘스트)**.

Before changing UI, characters, shops, items, HUDs, effects, or other visual assets, read:

1. `ART_DIRECTION.md` — canonical visual rules and tokens
2. `GAME_DESIGN.md` — game systems, audience, and screen flow
3. `art-direction.html?concept=crystal` — approved interactive reference

Treat Direction 01 as a locked product decision. Do not switch to the Arcade Guild or Magic Book directions, reintroduce a pixel-art UI, or mix their material language into production screens unless the user explicitly asks to reconsider the art direction.

Keep visual work mobile-first, readable for upper-elementary and middle-school learners, and consistent with the `Study = Battle` loop. Gameplay information must remain clearer than decorative art.

## SD character battle sprite animation

All production battle scenes must use animated Crystal Quest SD/chibi character sprites. Treat static profile portraits in battle as temporary fallback content only; replace them with SD sprite animation as each class and gender variant becomes available. Do not convert the game to pixel art.

Before creating or integrating battle sprites, read `ART_DIRECTION.md`, the character and battle sections of `GAME_DESIGN.md`, and the `crystal-quest-sd-sprite-animation` skill. Use the approved full-body identity art as the authority for the face, hair, costume, class silhouette, palette, prop, age tone, and proportions.

Apply these rules to every playable class and gender variant:

- Use youthful, nonsexualized SD proportions with a large readable head and hands, compact body, clear class silhouette, and one consistent facing direction.
- Every battle character must have, at minimum, idle, attack, and hit/knockdown animation states. The standard hit/knockdown strip uses exactly three frames: `guard/notice → impact/strongest recoil → complete knockdown`, with the third frame held until the battle state changes. It must not recover to idle inside the hit strip. Add skill, projectile, victory, recovery, or defeat states when the class design requires them.
- Define the animation contract before production: action, facing direction, frame count, runtime cell size, bottom-center anchor, effect bounds, frame names, timing, hit frame, and destination filenames.
- Use 320 × 320 px square runtime cells and a bottom-center anchor (`x: 0.5`, `y: 0.975`) by default. A different or wider cell is allowed when a weapon, cape, hair, projectile, or effect would otherwise be cropped; never shrink the character merely to force an effect into the default cell.
- Keep character scale and the ground line stable across every frame and state. No hair, feet, gloves, weapons, projectiles, or effects may cross a cell boundary or be clipped.
- Export runtime sheets as horizontal RGBA PNG strips with real transparent alpha. Never ship a painted white, black, or checkerboard background. Verify transparency over both a light background and a saturated Crystal Violet (`#5751D8`) background.
- Preserve white costume regions when removing a white source background. Do not use indiscriminate color-key removal that creates transparent holes in clothing, eyes, highlights, or effects.
- Keep generation originals, approved source frames, normalized runtime frames, the runtime strip, review composites, and preview animations separate. Do not overwrite an approved runtime asset before frame-by-frame and in-engine review passes.
- Store a JSON file beside each runtime strip. Record the image filename, frame width and height, frame count, layout, normalized anchor, frame names, per-frame duration, and gameplay events such as `hit: true`.
- Use deterministic frame ordering and equal-sized runtime slots. For a strip with `N` frames, configure CSS sprite playback using `background-size: N00% 100%` and `steps(N - 1, end)` when animating from the first slot to the last with `background-position: 0` through `100%`.
- Synchronize damage, enemy reaction, crystal effects, sound, and haptics to the declared contact frame rather than to the beginning of the animation.
- Keep each class motion readable at the actual mobile battle size. Melee classes may approach the enemy; ranged classes should cast or fire without hiding the character unless a dedicated full-motion strip intentionally includes both character and projectile.
- Respect `prefers-reduced-motion` with a shorter readable version of the same state change. Reduced motion must not remove gameplay feedback or make hit timing ambiguous.
- Integrate a new sprite only for the exact class and gender variant it depicts. Other variants must retain their current approved asset or fallback until their own matching animation exists.
- Test idle, attack, hit, final-frame hold, loop/reset behavior, mobile viewport layout, asset loading, console errors, and first-to-last state transitions in the browser. Run `npm run build` before declaring integration complete.

Use the following asset organization unless an established class folder requires a compatible variation:

```text
assets/characters/<class>/
├── source-frames/<action>-<variant>/
├── <action>-<variant>/01.png ... NN.png
├── char_<class>_<variant>_sd_<action>_strip.png
├── char_<class>_<variant>_sd_<action>_strip.json
└── review/
```

Recommended attack beats are `ready → anticipation → strike/contact → follow-through → recovery`. Recommended hit beats are `guard/notice → impact → strongest recoil → knockdown or recovery`. Shorter source sequences may omit intermediate beats, but they must still communicate anticipation/contact or impact/reaction clearly at gameplay size.

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

## Build and deployment

Use the following process whenever the user asks to deploy this repository. Do not spend time rediscovering the deployment mechanism unless these instructions or the repository configuration have changed.

1. Run `npm run build` and resolve any build failure before deployment.
2. Review `git status` and the diff. Commit only the intended source, generated bundle, and asset changes; do not include unrelated working-tree changes.
3. Before pushing, inspect the complete deployment diff against `origin/main`. Do not infer that a deployment is frontend-only:
   - If `supabase/migrations/**` changed, run `supabase db reset --local`, then `supabase migration list --linked` and `supabase db push --linked --dry-run`. Review the exact pending migrations, apply them with `supabase db push --linked`, and verify with `supabase migration list --linked` again.
   - If `supabase/functions/<name>/**` changed, deploy every changed function with `supabase functions deploy <name> --project-ref <project-ref>`. Determine `<project-ref>` from the linked Supabase project; never hard-code secrets or print them in logs.
   - If a changed function needs new or updated secrets, ensure they are configured with `supabase secrets set` before deploying the function. Never commit `supabase/functions/.env` or copy secret values into browser code, Android bundles, commands recorded in Git, or logs.
   - Database migrations and Edge Functions are not deployed by GitHub Pages. Do not omit these steps when the deployment diff contains corresponding changes. Deploy backend dependencies before publishing frontend code that relies on them.
4. Push the deployment commit to `origin/main` with `git push origin main`.
5. GitHub Pages automatically deploys from the repository root of the `main` branch using the legacy branch-based Pages workflow. The production URL is `https://heojoon.github.io/english-word-card-game/`.
6. Verify the `pages build and deployment` run for the pushed commit with `gh run list` and `gh run watch <run-id> --exit-status`. Do not report deployment as complete until this workflow succeeds.
7. A push to `main` also starts `.github/workflows/android.yml` when one of its configured paths changes. This produces the `wordoria-debug-apk` artifact; report its status separately from the GitHub Pages deployment.
8. Report the outcome of each applicable deployment target separately: database migrations, Edge Functions and secrets, GitHub Pages, and Android build. Any failed or skipped required target means the overall deployment is not complete.

Use the project-specific Supabase commands and function names documented in `README.md`. Discover current CLI flags with `supabase <group> <command> --help` rather than relying on remembered syntax.
