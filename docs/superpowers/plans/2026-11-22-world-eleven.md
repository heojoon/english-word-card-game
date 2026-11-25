# World Eleven Implementation Plan

> **For agentic workers:** Use executing-plans for runtime integration, with dispatching-parallel-agents for independent content, map-art, and database tasks. Preserve user files; do not commit or publish unless requested.

**Goal:** Playable 44-stage World 11 with sourced grade-3/grade-8 vocabulary, matching battles and four-choice Survival practice.
**Architecture:** A deterministic generated `world-eleven-content.js` owns the shared 44×30 pools per learning level. Internal chapter 14 uses `story-ch11-N`. A dedicated matching-boss module owns contact damage and cycles; the existing runtime owns common skills, input, rendering and saving.
**Tech Stack:** Plain browser JavaScript, Node content/build scripts, WebP/PNG assets, linked Supabase Postgres.
**Spec:** `docs/superpowers/specs/2026-11-22-world-eleven-design.md` (approved by user).

## Global Constraints

- 44 stages, 30 distinct English/Korean pairs within each stage, 1,320 assignments per level; review reuse between stages allowed.
- Elementary grade 3; middle grade 8. Internet sources verified; translations/expressions authored independently.
- Matching 5 pairs per board, six boards ordinarily. Bosses at 22/44, HP 200/240, 30-item decks repeat until HP zero.
- Shared progression record `스토리 11장 N · 낙성 요새의 마지막 수송`, internal chapter 14, World 10 stage 40 prerequisite.
- No unsolicited deployment or new special boss loot. Existing untracked novel files belong to the user.

## Review Focus

- Missing remote catalog/native offline fallback: source script must load locally and ship in dist.
- Level switching: rebuild the stage content without changing shared progression IDs.
- Ambiguous Korean labels: English and Korean labels unique in each pool/board and choices distinct.
- Lethal contact and board completion: exactly one damage event; do not end at 30 correct if boss still alive.
- Saved results: owner/prerequisite/replay checks server-side; failed saves remain retryable.

## Tasks

### Task 1: Sourced shared vocabulary (content agent)

Files: create `content/world-eleven-vocabulary.json`, `scripts/generate-world-eleven-content.mjs`, `world-eleven-content.js`, `scripts/verify-world-eleven-content.mjs`.
Interface: `window.WORDORIA_WORLD_ELEVEN_CONTENT={sources,levels:{elementary:[{number,name,words}],middle:[...]}}`; `words` are existing `[en,pronunciation,ko]` rows. Each array has exactly 44 entries of exactly 30 unique pairs.
- [x] Add a failing content contract test; verify expected missing-file failure.
- [x] Research official elementary/middle sources; curate original bilingual data and explicit provenance; deterministic stage assignment and generation.
- [x] Run the focused content test and generator; report content counts and level/source limitations.

### Task 2: World map art (map agent)

Files: create `assets/story/chapter-11-fallen-star-fortress-map.webp`, associated generation JSON and source/review files.
Interface: measured ordered `positions` of 44 `[x%,y%]` pairs in generation metadata, image dimensions, runtime path.
- [x] Read world-map/imagegen skills and guide; inspect/attach chapter-1 style source, approved art reference and story.
- [x] Generate a tall top-to-bottom 44-waypoint map; inspect actual positions and export runtime image, full prompt and review.
- [x] Verify 44 positions and increasing y; root will check mobile overlay integration.

### Task 3: Account results (database agent)

Files: create `supabase/migrations/20261122..._world_eleven.sql` as needed, targeted SQL/static verification.
Interface: `claim_world_eleven_boss_result(p_character_id uuid,p_stage text,p_correct int,p_duration_ms int,p_boss_hp int)` returns existing `award_game_result`-shaped fields including `game_score_id,coins_earned,balance`; owner/prerequisite/HP-zero validation and existing standard rewards. Register ordinary stages in existing catalog if required. No new special fixed boss payout.
- [x] Inspect latest score/reward RPCs; document policy and prove existing behavior cannot handle new stage/variable boss total as needed.
- [x] Add the smallest migration preserving prior worlds, grants/RLS, ownership and atomic replay handling.
- [x] Inspect linked CLI and dry-run; apply only task migration if authorized and safe, otherwise report exact blocker and retain reviewable migration. Never local DB.

### Task 4: Runtime, matching boss and novels (root)

Files: `crystal-game.js`, `crystal-game.css`, `world-eleven-boss.js`, `scripts/generate-story-novel.mjs`, `scripts/verify-world-eleven.mjs`, `index.html`, `scripts/build-web.mjs`, `package.json`, `GAME_DESIGN.md`.
- [x] Add failing contract tests for chapter-14 stages/progression, shared practice pools, matching HP contact/cycles/Ice Time and novel triggers.
- [x] Implement stage/world/practice construction and loading without adding new pools to unrelated elementary worlds.
- [x] Implement matching boss state and integrate current hero/common-skill/damage/tick/result/cleanup paths. Timer `max(180,ceil(HP/DMG)*6)` seconds, ordinary 180 seconds.
- [x] Generate dedicated boss idle/attack/hit assets and metadata, preserving Alpha and final-frame hold.
- [x] Wire the five existing novel files and generated bundle. Connect saved result API from Task 3.
- [x] Add script/build dependencies and run targeted tests.

### Task 5: Integration verification (root)

- [x] Validate data/art/DB agent outputs against spec; inspect map/mobile overlays, asset loading and exact class/variant behavior. Browser automation only for required map alignment; no unsolicited boss playtest.
- [x] Run relevant regression tests and `npm run build`; inspect changes and all generated outputs.
- [x] Fresh final review; fix material issues and rerun affected checks. Report completed implementation, sources, validation and remaining remote blockers without claiming deployment.

## Execution notes

User approved the concrete design and requested implementation. Continue in the named workspace preserving untracked story originals; choose a task branch if Git permits. Do not insert another approval gate for routine plan/execution choices. The developer's authorization-persistence instruction takes precedence over skill handoff prompts.

## Completion evidence

- npm test: 258 passing, 0 failing. npm run build: successful; dist runtime files and six boss strips byte-match source.
- Sourced content: 44 x 30 assignments and 264 curated items per learning level, distinct English/Korean within each stage.
- Linked production DB: migration 20261122014752 applied through the connected MCP after CLI token absence; remote/local history checked and real-account SQL rollback regression passed before and after apply.
- Map-only browser QA: 390/360/320px, 44 ordered nodes, no overlap of circular 44px targets, stage 1/22/44 pointer hits, no page errors. See scripts/review-world-eleven-map.cjs and asset review JSON. Boss browser playtest not requested; offline frame/logic/common-skill checks passed.
- Independent review found ranger/pet matching classification and optional-stage prerequisite text omissions; fixed and regression verified.
- No commit, push, Pages deployment or Android build requested. Work retained on feat/world-eleven.
