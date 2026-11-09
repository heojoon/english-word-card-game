# Bard asset pipeline report

## Implemented
- `scripts/assemble-bard-sprites.py`: alpha-aware extraction, shared scale per source group, stable lower-body ground-contact anchor, equal runtime packing, separate original-size source master and runtime review master with exact50px transparent gaps.
- `scripts/verify-bard-assets.py`: validates all seven expected strips, RGBA alpha, safe margins, frame count/order, source/review gap geometry, release/contact events, final down hold, and exact correspondence with individual normalized frames.
- `assets/characters/bard/animation-contract.json`: 320×320 idle/attack/projectile; 384×320 hit preserves recoil/prone silhouette without shrinking; character anchor(.5,.975), projectile anchor(.5,.5), baseline312.
- Non-SD 512px profile crops exported from original concept to `assets/avatars/variants/bard-{male,female}.webp`; original backdrop retained, no repaint or background removal.

## Review and evidence
- Male/female two-frame idle, six-frame attack and three-frame hit reviewed at128px over Moon White and Crystal Violet. Poses preserve exact variant, harp, costume, readable blink/anticipation/release/final active sweep, and full prone final hold.
- Generated originals retained unchanged. Only alpha below16 is cleared on copies for normalization; no color-keying of violet/blue costume or effects.
- Attack timelines: release400ms, projectile contact640ms, reduced contact256ms; JSON and verifier assert this contract.
- `python scripts/assemble-bard-sprites.py --action attack --variant male` and female: pass, six frames320×320 and exact50px source/review gaps.
- `python scripts/assemble-bard-sprites.py --action hit --variant male` and female: pass, three frames384×320 and exact50px source/review gaps.
- `python scripts/verify-bard-assets.py`: all seven runtime strips and non-SD profiles pass.
- Full validator initially failed as expected before asset generation: expected7 manifests, found0.
- Projectile source04-06 has74px true transparent separation after clearing only alpha below16. Apparent overlapping glow was low-alpha noise; legitimate effect content was not erased.
- `python scripts/assemble-bard-sprites.py --composites-only`: pass. Male/female320/390px battle timelines reviewed on both backgrounds, normal/reduced clocks. Actual production dimensions used: hero120.5px, ground bottom13px, cast(.64,.47), projectile72px. Notes emerge at harp, travel, contact target at640ms/256ms, burst at700ms/280ms and reset760ms/304ms.

## Limits
- Browser playback not run because repository instructions restrict browser checks to an explicit user request. Offline asset review does not establish in-engine verification or user approval.
