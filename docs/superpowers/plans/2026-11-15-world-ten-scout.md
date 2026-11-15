# World 10 Starlight Scout Integration Plan

**Goal:** Ship the existing scout identity as an animated ordinary enemy in World 10.

**Architecture:** Reuse the spelling battle's shared sprite/contact scheduler. Add an explicit World 10 ordinary-stage predicate and scout renderer; keep the three existing bosses and stage rules intact.

**Tech Stack:** JavaScript, CSS sprite strips, RGBA PNG, Pillow for deterministic sheet extraction, Node regression tests, GitHub Pages and Android CI.

- [x] Generate identity-matched left-facing idle (2), punch attack (3), hit/complete-down (3) source frames. Normalize to 320×320, anchor (0.5, 0.975), preserve originals and exact 50px review gutters.
- [x] Add regression coverage for stages 1–19, 21–39, 41–42 (exclude bosses 20/40/43), contact damage, retry, pause, stale callbacks, reduced motion and renderer selection.
- [x] Wire scout state, renderer, shared combat scheduling, pause/resume and CSS assets. Exclude work frames from native staging.
- [ ] Run relevant regressions and npm run build. Review deployment diff against origin/main for backend changes, commit intended files and push main.
- [ ] Verify Pages and Android workflows separately for the pushed commit.

Verification before deployment: targeted regressions 52/52; full npm test 242/242; fresh code review found no actionable issues. Light/violet frame composites reviewed. Source generators returned different resolutions and approximate gutters; normalized using recorded standing-height scales and rebuilt exact 50px review gutters. No browser checks requested. No backend changes in the deployment diff. Current repository uses `.github/workflows/pages.yml` to publish built `dist/`, superseding the older branch-based workflow documented in repository instructions.
