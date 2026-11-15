# Crystal King Implementation Plan

> Execution: implement in this session using executing-plans. User explicitly requested implementation; no additional approval round. Preserve unrelated working-tree edits and use the existing workspace.

**Goal:** Replace World 10 extra 3 Astra with the supplied Crystal King, including standing, SD animation, summon skill and narrative.
**Architecture:** Extend existing world-ten-boss.js state machine and shared renderer, retaining shared damage/defense/time-freeze and persistent record keys.
**Tech Stack:** static JavaScript/CSS, imagegen RGBA assets, Node/FFmpeg packing and Node regression tests.
**Spec:** docs/superpowers/specs/2026-11-14-crystal-king-design.md

## Global constraints
HP 180; Type C; 30-question cycle; record ID story-ch10-extra-3 and existing record name; no new rewards/backend changes; no deployment. SD 448×384 left-facing, anchor (0.5,0.975), 3 frames each idle/attack/hit/skill. Summon every 20s and once at HP 50%, warn 1200ms, HP1 at contact, end1500ms. Reduced motion .5 timing.

## Review focus
Existing Astra clear recognition; queued skills with lethal damage; ice-time/pet freeze during warning; generated transparent margins; new asset path staging.

## Tasks
- [x] 1. Generate standing and four 3-frame SD action sources. Record full prompts/references; preserve originals. Pack only new Crystal King assets, with per-strip metadata, spaced source/review sheets and light/violet mobile composites. Inspect frames and alpha.
- [x] 2. Add failing regression cases to scripts/verify-world-ten-boss.mjs for Crystal King contact HP, summons, freeze, reduced motion and exit cancellation. Implement crystal-king in world-ten-boss.js; wire crystal-game.js display/entry/standing/skill effects and crystal-game.css. Preserve old record name. Verify with node --test scripts/verify-world-ten.mjs scripts/verify-world-ten-boss.mjs.
- [x] 3. Rewrite assets/novel/world-10-extra-{start,end}.md, regenerate story-novel.js with existing build script, update GAME_DESIGN.md. Run npm test and npm run build, inspect final diff and asset staging. Browser not requested.

## Ledger
Initial: pre-existing edits in crystal-game.js, scripts/verify-arkaon-reward.mjs and a Supabase migration must be preserved. No commits or deployment requested.

Task 1: complete — generated standing plus12 frames; all4 strips, 50px-gapped masters, manifests, previews and light/violet reviews present. Geometry/alpha check passes. See assets/monsters/world-10/crystal-king/offline-review.json.
Task 2: complete — red run showed unknown Crystal King and Astra catalog; after implementation25/25 focused tests pass. Two test expectation corrections: existing record title is 별빛이 끊긴 관측탑, and next20s warning is reached17000ms after two1500ms skills at20000ms.
Task 3: complete — npm test232/232 passed; npm run build exit0; staged runtime sources equal workspace sources, all4 strips and standing present; generation/review/frame folders excluded. git diff --check passed.
Final review: independent read-only reviewer found no material issues. Browser not run (not requested). No commit or deployment performed.
