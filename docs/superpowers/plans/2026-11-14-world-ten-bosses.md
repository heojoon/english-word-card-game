# World Ten Bosses Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement task by task in the current workspace.

**Goal:** Replace Lumen and Seiran placeholders with standing art, SD animations and approved boss skills.
**Architecture:** A standalone `world-ten-boss.js` owns deterministic state and events. Existing Type C battle adapters select this module only for Lumen and Seiran; World 9 and Astra retain their existing module.
**Tech Stack:** Static JavaScript, CSS, imagegen, FFmpeg for lossless packing, Node regression tests.
**Spec:** `docs/superpowers/specs/2026-11-14-world-ten-bosses-design.md` (approved by user).

## Global Constraints

Preserve existing working-tree changes. Work in place because the World 10 implementation is uncommitted here and is the integration base. Do not commit or deploy. No new database/reward/audio work. HP 200/240, Type C 30-question cycling, 6 seconds per expected DMG hit remain unchanged. Browser checks only on request.

## Review Focus

- Lethal contact cancels queued boss damage, including a large delta spanning both contacts.
- Fractional shield damage remains useful for DMG 1 and applies to fire-arrow damage as well.
- Question/answer relations survive shuffling; a player attack already in flight finishes first.
- Ice Time and pet freeze stop warning/shield clocks while hit feedback completes.
- Exit/retry/pause clear delayed events and preserve current HP/MP.

### Task 1: Character assets

Files: `assets/novel/characters/char_{lumen,seiran}_world10_standing.webp`; `assets/monsters/world-10/{lumen,seiran}/`; `scripts/assemble-world-ten-bosses.mjs`.

- [x] Record geometry, frame timing and contact/hold contracts before generation.
- [x] Generate one standing image per boss, then matching SD idle/attack/hit/skill (Lumen shield also). Inspect generated alpha and identity; retain all source assets.
- [x] Pack equal cells without repainting using FFmpeg. Record metadata; produce 50px-spaced review masters and light/violet review images. Inspect complete frames at mobile scale.

### Task 2: Boss state and skills

Files: `world-ten-boss.js`; `scripts/verify-world-ten-boss.mjs`.

Interfaces: `reset(kind,damage)`, `damage(state,amount)`, `answer(state,correct,contactMs,reduced)`, `advance(state,delta,clockDelta,onNextQuestion?)`, `visual(state)`, `clear(state)`, `shuffleChoices(state,random)`; events compatible with existing training-boss adapters plus `shuffle` and `skill-start/end`. The synchronous optional question callback applies question passives before a queued skill can lock input.

- [x] Write and run failing behavior regressions for contact DMG, shield timing/fractions, cycle-independent HP victory, shuffle identity, one-shot threshold queue, freeze, pause/exit/duplicate input and reduced timing.
- [x] Implement state machine with chronological contact/expiry processing. Start queued skills only after current answer completes. Lumen shield contacts at 1000ms and lasts 4000ms; other skills at 1200ms, end at 1500ms. Period 20000ms.
- [x] Run `node --test scripts/verify-world-ten-boss.mjs` and verify pass.

### Task 3: Runtime integration

Files: `crystal-game.js`, `crystal-game.css`, `index.html`, `scripts/build-web.mjs`, `package.json`, `GAME_DESIGN.md`.

- [x] Select new module for Lumen/Seiran in reset, damage, answer, advance and visual paths. Keep Astra unchanged. Add new standing introductions, skill descriptions, sprites, shield/mirror/beam feedback, held knockdown and reduced-motion state.
- [x] Add dependency before runtime and build file entry. Exclude generation/review/extracted frame assets from dist.
- [x] Add runtime regression coverage for selection, common Ice Time/defense/reuse, frame metadata, dependency loading and cleanup.
- [x] Run targeted World 9/10 and active-skill regressions; run `npm run build`.
- [x] Independent final code review as required by executing-plans; fix important findings and verify changed cases. Report browser verification unperformed.

## Execution notes

The user approved the complete design and requested implementation; proceed directly without another plan approval. No worktree is created because it would omit existing uncommitted World 10 dependencies. Tests are limited to necessary boss/runtime regressions.

## Completion ledger

- Task 1 complete: two standing WebPs, nine RGBA animation strips / 27 frames, manifests, original prompts/references, extracted and normalized frames, 50px-gapped masters, previews and light/violet technical review. See `assets/monsters/world-10/offline-review.json`.
- Task 2 complete: initial test run failed with missing module; deterministic state/skills implemented and 18 focused behavior/runtime/asset tests pass.
- Task 3 complete: both exact boss identities wired into production entry, shared Type C runtime, common damage/defenses, Ice Time, narrative art and dist staging. Astra and World 9 remain on their original module. Build passes; staged dependencies/assets and source/review exclusion checked.
- Final review: independent reviewer found the next-question mage-passive/queued-skill input deadlock. Reproducing regression failed first; synchronous question preparation before skill scheduling fixes it and the regression passes. Shared defense expiry at an exact wrong-answer contact was also pinned RED→GREEN. Mirror timing override is recorded in its manifest.
- Full suite: 224/225 pass. Existing `verify-bard.mjs` expects healing HP 1→3 while unchanged committed `active-skills.js` heals HP 1→2. Confirmed against `HEAD`; unrelated ability logic was left unchanged.
- Browser checks and deployment were not requested and were not run. No commits or worktree changes were made.
