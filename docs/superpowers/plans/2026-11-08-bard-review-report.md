# Bard independent code review

Reviewed scope: class selection and growth, shared passive/active execution, vitals persistence, account/RPC migrations, ranged runtime, CSS timing and manifests. No browser automation or visual sign-off performed.

## Confirmed
- Bard base stats and per-level growth equal sniper; common EXP calculation unchanged.
- Healing is available from creation, spends MP1, restores up to HP2, refuses full HP/dead/busy/paused/ended states.
- Passive uses actual answeredCorrect where legacy bosses inflate correct by damage, caps MP and does not bank full-MP awards.
- Account migration preserves authentication, profile row serialization, atomic ticket consumption and sniper gender restriction.
- Vargas patch preserves existing validation and avoids inserting unsupported bard into the legacy unlock table.
- Earlier pause and Survival contact-haptic omissions are fixed with behavior regression tests.
- Character release400ms / projectile contact640ms matches CSS; reduced release160ms/contact256ms preserves causal order. Hit uses wider384x320 cells at unchanged height.

## Follow-up review
- Original three findings (plain-battle pause class, Survival contact haptic, contact redraw restarting playback) are fixed. `replaceScreenMarkup` now captures actual descendant animation target/name/currentTime/playState/playbackRate before removal and restores the new animation objects after reinsertion. Regression models animation object recreation. Parent also supplied successful actual Chromium checks for paused/running/finished animation continuity.
- New bard scheduler correctly uses unpaused elapsed time and rejects stale callbacks after battle replacement. Optional timeout allowance is scoped to bard; existing crystal-spider scheduler callers retain their default guard.
- Additional P2 scope gap resolved: `royalSlimePick` and generic `answerStorySpelling` now use `bardSchedule` for bard contact/reset/retry timers. The real callback regression covers Survival, ordinary Story, hidden king, royal slime and generic spelling through a mid-attack pause. Parent final full suite:203/203 passing. Existing isolated test fixtures now explicitly supply their non-bard selected character.

Primary source: [Chrome state-preserving DOM move guidance](https://developer.chrome.com/docs/modern-web-guidance/guides/ui-behaviors/move-dom-element-without-losing-state).

## Evidence
- Independently ran `node --test scripts/verify-bard.mjs scripts/verify-bard-runtime.mjs scripts/verify-active-skills.mjs`:58/58 passed before final runtime additions.
- Re-ran the same targeted command after animation snapshot and scheduler changes:63/63 passed.
- Read latest runtime tests covering ordinary Story/Survival pause and contact haptic fixes; parent reports full suite201/201 passing.
- Backend rollback-test and linked migration evidence inspected in backend report; reviewer did not rerun remote database writes.
- Read `assets/characters/bard/review/browser-review.json`: actual local demo Survival male/female plus eight production-CSS preview combinations. Browser runs executed by parent under the invoked SD skill; this reviewer did not run a browser.
