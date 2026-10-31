# Fever Roulette Implementation Plan

> **For agentic workers:** Use executing-plans to implement this plan task-by-task.

**Goal:** Give World 8+ ordinary clears an equal-probability reward wheel with new audio.
**Architecture:** Extend the existing renderer with an explicit ready/spinning/requesting/stopping/result state. An atomic Supabase RPC chooses account outcomes and persists receipts; guest spins reuse the same formula locally.
**Tech Stack:** Vanilla JavaScript/CSS, Node test runner, PostgreSQL, ElevenLabs, ffmpeg.
**Spec:** `docs/superpowers/specs/2026-10-31-fever-roulette-design.md`

## Global Constraints

- Each wedge is 20%; multipliers are [1, 2, 3, 0.5, 0]. Round the product once.
- Freeze the clear-time remainder. Internal chapter 11 is World 8.
- Preserve existing edits, boss contracts, learning-level independent records and replay payout rules.
- No browser checks without a user request; no frontend secret keys.

## Review Focus

- Double presses and delayed requests must not cause multiple payouts or outcomes.
- Pause, hidden/native state, reduced motion and exit must not leave ticking audio or timers running.
- World 7 and bosses without fever must preserve their current paths.
- A network retry must reuse the original request ID and settled outcome.
- Zero and fractional remaining time must round consistently between SQL and JavaScript.

### Task 1: Roulette state and presentation

- [x] Add failing Node runtime tests for boundaries, multipliers, clear routing, double input, pause, result alignment and retry.
- [x] Add roulette functions in `crystal-game.js`, route eligible clears, render the wheel and result overlay in `crystal-game.css`.
- [x] Verify targeted tests pass; retain existing fever behavior.

### Task 2: Atomic account settlement

- [x] Create migration with a request-receipt table, owner-only RLS, and `claim_story_roulette_reward` RPC.
- [x] Validate ordinary World 8 stage, 40 answers, duration and character ownership; sample `floor(random()*5)` server-side and preserve first-clear payout semantics.
- [x] Add retry and replay regressions. Apply to the linked remote database and verify ownership rejection, grants and transactional payout/receipt replay using rollback-only fixtures.

### Task 3: Generate and integrate audio

- [x] Generate BGM, tick, button, cheering fanfare and blank cue with recorded prompts and generation metadata.
- [x] Process browser assets and add `ROULETTE_*` manifest events without replacing existing edits.
- [x] Drive ticks by wheel angle, stop them on pause/exit, and play fanfare once with the result.

### Task 4: Verify

- [x] Run the new tests, `npm test`, and `npm run build`.
- [x] Review the task diff and preserve unrelated files. Report any incomplete validation explicitly.

Execution ruling: work inline in the current dirty workspace to preserve the user's existing changes; no branch switch, commit or deployment requested. The user confirmed the outstanding probability choice. Continue implementation under the existing request.


Verification ledger:
- Fifteen roulette runtime regressions pass, including actual clear routing/tick, replay, retry, pointer alignment, pause, keyboard input, focus, extended warrior clocks and account level-up recovery.
- Remote rollback-only SQL fixture passes formula, wallet, ledger, idempotence, replay, stage and ownership assertions, including warrior clears beyond 240 seconds.
- Migrations 20261031143542 and 20261031144422 are applied and recorded on the linked remote DB. RLS is enabled; anon cannot claim/read, and clients cannot insert receipts.
- Five original audio assets generated; seven processed browser assets decode. Loop trimmed to sixteen bars / 32 seconds. Listening review remains pending.
- Full suite and build rerun after final fixes. No browser checks, commit, push, GitHub Pages deployment or Android build requested.
- Review fixes: preserve the actual passive-extended clock with a class-specific server cap; redraw after pause; suppress paused music; focus and isolate the result dialog; reject stale answer shortcuts; defer settled score insertion until the existing level-up recovery path captures its prior level.


2026-11-01 probability revision: blank 5%, x0.5 10%, x1 30%, x1.5 25%, x2 20%, x3 10%. Supersedes equal-probability references above. Keep old receipt indices stable; append x1.5 at index 5. Use weighted wedge sizes, guest sampling and server sampling; verify all 100 one-percent buckets and sector alignment. Apply only the new weighted-probability migration; rerun rollback SQL fixtures, full tests and build.
