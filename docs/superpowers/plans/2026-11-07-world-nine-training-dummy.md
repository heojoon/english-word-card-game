# World Nine Training Dummy Implementation Plan

> **For agentic workers:** Execute inline using executing-plans.

**Goal:** Generate and integrate both training dummy variants into World 9 common battles.
**Architecture:** Reuse the shared spelling-battle contact scheduler and crystal-spider strip player; add an exact chapter/stage variant selector and dedicated markup/CSS.
**Tech Stack:** JavaScript, CSS, generated RGBA PNG, Python Pillow for mechanical packing, Node tests.
**Spec:** `docs/superpowers/specs/2026-11-07-world-nine-training-dummy-design.md`

## Global Constraints
Internal chapter 12 only, stages 1–14 basic and 16–29 advanced. No boss, vocabulary, economy or database changes. Preserve existing unrelated CSS and assets. No browser checks without a user request.

## Review Focus
Boss exclusion; stage boundaries; pause/contact ordering; alpha and cropping; reduced motion and final-frame hold.

### Task 1: Assets
- [x] Generate basic and advanced source art using built-in image_gen; archive prompts and originals.
- [x] Inspect and pack 320×320 RGBA frames, 2/3/3 horizontal strips, JSON manifests, exactly 50px-gapped review masters and previews.
- [x] Verify alpha, dimensions, cell margins, scale and down poses visually.

### Task 2: Integration
- [x] Add regression tests for variant boundaries, boss exclusion, actual markup and contact/pause behavior; run red.
- [x] Modify crystal-game.js and append scoped CSS to reuse existing timed feedback for dummy mobs.
- [x] Run regression tests, npm test and npm run build; inspect the final diff.

## Decisions / execution ledger
- Work in the user's shared checkout to make the requested game integration directly reviewable; preserve pre-existing CSS edits and untracked skill/map art. No commits or deployment requested.
- Design already approved through selection and explicit request to generate and apply; no new approval gate.
