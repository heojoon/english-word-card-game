# Seal Guardian Knight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 7C-30을 전용 HP 보스전과 스탠딩·SD·최초 보상으로 완성한다.
**Architecture:** `seal-knight-boss.js`는 상태·접촉·스킬을 관리한다. 기존 Nereus 입력/어휘 기반을 활용하되 무한 보드 공급을 보장한다. `crystal-game.js`는 렌더링·공용 스킬·결과를 연결한다.
**Tech Stack:** JavaScript IIFE, Node test, PNG/WebP, Pillow, Supabase PostgreSQL RPC.
**Spec:** `docs/superpowers/specs/2026-10-31-seal-knight-design.md`

## Global Constraints

- HP 240, 300000ms, 700 crystals, 학습 수준 독립 기록 `story-ch7c-30`.
- 기존 작업 변경 보존. 브라우저/배포 미실행. 운영 DB만 사용.
- 실제 alpha, 3-frame hit hold, 50px source/review gaps, contact-time damage.

## Review Focus

- 큰 delta/여러 임계치에서 큐·피격 누락 없음.
- 방패 피해 감소가 기본 공격과 파이어 애로우에 동일하게 적용됨.
- 고유 어휘 주기가 보드 경계에서 중복 쌍을 만들지 않음.
- 시간 만료/퇴장/HP 0 이후 지연 공격 차단.
- 재요청/다른 캐릭터/기존 일반전 기록에도 첫 보상 중복 없음.

### Task 1: Assets and battle module

Files: create `seal-knight-boss.js`, `scripts/verify-seal-knight.mjs`, `scripts/assemble-seal-knight.py`, `assets/monsters/seal-knight/*`, standing CG.
Interfaces: `window.WORDORIA_SEAL_KNIGHT.{reset,clear,deck,board,pick,advance,visual,damage,INFO}`; `advance(state,delta,shuffle,clockDelta)` returns events.
- [x] Write/run failing contact, HP 180/45-hit, cycling, shield, thresholds, ice, pause/clear tests.
- [x] Generate standing and identity-consistent SD with metadata; assemble/review alpha and mobile frames.
- [x] Implement module and run `node --test scripts/verify-seal-knight.mjs` to pass.

### Task 2: Runtime integration and rewards

Files: modify `crystal-game.js`, `crystal-game.css`, `index.html`, `scripts/build-web.mjs`, `scripts/generate-story-novel.mjs`, `package.json`; create migration and reward regression tests.
Interfaces: uses Task 1 module and `advanceCombat(state,delta,shuffle)` for chronological shared effects; `saveSealKnightReward(battle)` calls `claim_seal_knight_reward(uuid,int,int,int)` and records server receipt.
- [x] Add failing integration/reward regressions for stage flags, fire arrow, variable correct count, first/retry rewards, save retry.
- [x] Wire entry/deck/render/input/tick/exit/result/recovery/novel, shield feedback and HP display.
- [x] Add atomic 700 crystal RPC, check linked migration status/dry-run before applying only intended migration.
- [x] Run all regressions and `npm run build`; inspect diff and final independent code review.

## Execution ledger

- Ruling: user delegated all choices and requested execution; no further plan approval needed.
- Ruling: git worktree creation failed with `.git/refs/heads` permission denial; implement in current workspace, preserving initial changes in audio manifest/CSS/JS. Do not commit unrelated edits.
- Ruling: wide sword/effect bounds require 384x320 runtime cells; extracted complete non-touching alpha components and repacked exact 50px source/review gutters. Raw generation spacing is documented as variable.
- Review: independent reviewer found late burn/time ordering; added a regression that failed, then implemented `advanceCombat` to interleave boss, shared actives and pets at exact time boundaries. Shield onset/expiry, timer ties and late burn now pass.
- Ruling: fire-arrow-only HP-zero victories may have zero correct answers. Preserve correct=0 and use total>=1 for the existing DB constraint; dedicated follow-up migration applied rather than changing migration history.
- Verification so far: 129/129 Node tests; offline alpha/mobile reviews; linked DB first/repeat/cross-character/ownership/invalid result tests in a rolled-back transaction. Browser and deployment are outside the request.
- Final verification: `npm run build` passed and staged boss module/art in `dist/`; `npm test` 129 passed, 0 failed; `git diff --check` passed. All four runtime PNG/JSON pairs validated as 3×384×320 RGBA with real alpha. Both migrations match linked remote history. SQL regression also verifies correct=0, total=1. Independent review finding fixed through RED→GREEN tests; no deferred code-review findings. Existing unrelated audio/CSS/JS edits preserved; no commit, push, Pages or Android workflow started.
