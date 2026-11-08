# World 9 Bosses Implementation Plan

> Implement inline using executing-plans; requested implementation and deployment already authorized.

**Goal:** Produce and deploy Griffin/Iris assets and approved option-two mechanics.
**Architecture:** Extend world-nine-boss.js state/event module; crystal-game.js owns shared combat integration and renderer. Keep existing server results and progression.
**Tech Stack:** Static JS/CSS, Node tests, Pillow packing, built-in imagegen.
**Spec:** ../specs/2026-11-08-world-nine-boss-option-two.md

## Global Constraints
HP 200/220; contact DMG; ceil(HP/DMG)*6000ms; no new rewards; production database only; no browser checks without request.

## Review Focus
Large ticks and timeout order; frozen skill warnings; exam thresholds crossed in bulk; short/repeated-letter words; nonlethal victory and held final frames.

### Task 1: Boss behavior
- [ ] Add failing tests in scripts/verify-world-nine-boss.mjs for queued wind/exams, threshold once, freeze/contact, blank uniqueness and fixed retries.
- [ ] Extend reset/damage/answer/advance and add question(state,entry,baseQuestion) and visual(state) in world-nine-boss.js. Wire question preparation, shared HP damage, feedback and renderer in crystal-game.js. Run focused tests.

### Task 2: Art and narrative
- [ ] Generate standing identities then referenced SD state frames. Pack with scripts/assemble-world-nine-bosses.py; store sources, frames, 50px review masters, composites, manifests under assets/monsters/world-9/{griffin,iris}.
- [ ] Add sprite renderer/CSS and introduction/novel standing paths; update story-novel.js via generator. Verify alpha, all frames, bounds, event timing and final hold.

### Task 3: Validate and deploy
- [ ] Run npm test and npm run build. Request independent code review, resolve material findings.
- [ ] Inspect entire origin/main deployment diff for backend changes; deploy required backend before frontend. Commit only this work and push to origin/main; watch Pages and Android workflows separately.
