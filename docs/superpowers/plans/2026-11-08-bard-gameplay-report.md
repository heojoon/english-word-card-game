# Bard gameplay implementation report

Status: DONE. No commit or push.

## Changes
- `crystal-game.js`: bard roster, male/female portrait paths, exact sniper stats/growth, initial active availability, skill cards/button fallback SVG, automatic passive entry, Hall of Fame support, and live HP/MP refresh/persistence after bard recovery.
- `active-skills.js`: available-from-start Healing Aria (MP1/HP2 capped), all existing input guards, and Continuing Melody (MP1 per five actual correct answers, capped and never banked at full MP).
- Legacy boss answer counters use `answeredCorrect` when supplied, avoiding damage credits counted as answers. Wrong answers and five-pair group changes do not reset melody.
- `scripts/verify-bard.mjs`: nine behavior tests; added to `npm test`. Existing locked-active test now scopes World 8 reward skills, preserving their gating while allowing bard's base active.
- `GAME_DESIGN.md`: exact growth, passive and active rules documented.

## Verification
- Watched initial failing bard tests (missing roster, skills, recovery); implemented and reran.
- `node --test scripts/verify-bard.mjs`: 9/9 passed.
- `node --test scripts/verify-bard.mjs scripts/verify-active-skills.mjs`: 51/51 passed before adding final two bard tests.
- `npm test`: 193/193 passed, zero failures, 2026-11-08.
- `node --check crystal-game.js` and `node --check active-skills.js`: passed.
- No browser checks, as requested by repository policy. No asset/timing/hero-markup edits; root owns those. Build deferred to root after asset/runtime integration.

## Review notes
- Passive is Story-only because Survival has no usable MP resource or Story skill actions.
- No backend unlock record is needed: bard heal is a base skill. Existing World 8 unlock eligibility for other classes stays unchanged.
- Portrait paths expected: `assets/avatars/variants/bard-male.webp`, `assets/avatars/variants/bard-female.webp`.

## Runtime integration follow-up

- Added male/female bard battle markup, independent note projectile overlay, display cell120.5px (272px source standing height), stable bottom anchor and no container lunge/rotation.
- Idle2/attack6/hit3 frame playback; hit-only384×320 cells use aspect1.2 without shrinking the character. Complete knockdown holds until state reset.
- Character release400ms, projectile contact640ms (frame4), burst700ms; reduced motion scales to40% (release160ms/contact256ms). Existing Story action minimum900ms retains final poses and enemy reactions.
- Harp cast origin(.64W,.47H); flight travels to the actual target's center, selecting `.crystal-spider-target` before the first generic enemy. Impact/shard feedback uses the same position and contact delay.
- Ice Time freezes idle only; pause freezes all bard arena descendants/pseudo effects. Plain Story and Survival now toggle the pause class for bard as well as existing boss paths.
- Survival and ordinary Story success haptics now wait for bard contact.
- `replaceScreenMarkup` preserves the bard hero node across a contact redraw only during the same continuous attack and same run. Idle/new attack/new battle get fresh nodes. World9's older manual hero reinsertion excludes bard.
- Updated index asset query versions for CSS, active skills and runtime JS to20261108-bard.

### Runtime verification

- TDD: initial runtime tests failed on missing hero/timing/geometry/CSS; review regressions failed on pause, anticipation haptic and missing DOM preservation before fixes.
- `node --test scripts/verify-bard-runtime.mjs`: 8/8 passed.
- Fresh `npm test`: 201/201 passed, zero failures.
- `node --check crystal-game.js`: passed.
- esbuild CSS parse: zero warnings.
- Tests validate extracted production functions, exact CSS timing contracts, target geometry and retained node identity. In-browser CSS animation continuity/visual alignment remain unverified because browser checks were not requested. Art asset validation/build remain root's integration step.
