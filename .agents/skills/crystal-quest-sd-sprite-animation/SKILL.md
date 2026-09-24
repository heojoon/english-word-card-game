---
name: crystal-quest-sd-sprite-animation
description: Create or revise Crystal Quest SD/chibi 2D characters and production-ready melee or ranged attack, projectile, and hit-reaction sprite strips. Use for Wordoria character animation asset work, especially bow, spell, or thrown-weapon attacks that need synchronized character and projectile layers; not for portraits, UI art, or pixel-art conversion.
---

# Crystal Quest SD Sprite Animation

Create readable mobile-game animation assets while preserving the approved character identity and Crystal Quest visual direction.

## Required context

Before changing assets, read the repository `ART_DIRECTION.md` and the relevant character/battle sections of `GAME_DESIGN.md`. Inspect the canonical identity artwork and at least one shipped battle asset at its actual display size. Treat the identity artwork—not an earlier generated strip—as the authority for face, hair, costume, palette, prop, and proportions.

Use the installed `imagegen` skill for generation or image edits. Use the general `sprite-pipeline` skill only as supporting normalization guidance; the workflow below overrides its strip-first default when wide props, projectiles, hair, or effects risk crossing frame boundaries.

## Workflow

1. Establish the asset contract before generation: action, facing direction, frame count, runtime frame size, anchor, effect bounds, file names, and whether frame 01 must match an existing idle pose.
2. Make or approve one full-body SD identity frame. Preserve youthful, nonsexualized proportions, a large readable head and hands, compact body, class silhouette, and real transparent alpha. Do not use a profile portrait as the runtime frame without adapting it to a stable full-body ground line.
3. Write explicit animation beats for every frame. For six-frame attacks:
   - attack: ready → anticipation → charge → aim → release → final attack pose;
   - Frame 06 is always an active, readable attack pose or impact/strike peak. It must not be a recovery, return-to-idle, or neutral pose.
   - projectile layer: charge → launch → near travel → far travel → contact → burst/fade;
   Use exactly three frames for the standard hit/knockdown state:
   - hit/knockdown: guard or notice → impact with strongest recoil → complete knockdown.
   - The third frame must read as fully down and unable to stand, not crouching, recovering, or returning to idle. Hold this final frame until the battle state changes.
   - Keep the prop with the character unless the class contract explicitly defines a separate dropped-prop layer. Do not add an attacker, blood, wounds, or injury detail.
4. Generate a full strip first only when the entire character, prop, and effect can remain well inside each slot. For attack and hit/knockdown sheets, require exact slot count, one complete character per slot, stable scale/ground line, one direction, and **exactly 50 px of fully transparent space between every adjacent source/review frame**. Record this as `sourceFrameGapPx: 50`; it is not optional and may not be replaced with an approximate or variable gutter.
5. If any frame crosses a slot, loses the character, crops a prop/effect, or becomes hard to extract, stop repairing the crowded strip. Generate smaller 2–3-frame groups with larger slots or isolated frames from the same canonical reference. Consistency is judged against the reference and neighboring approved frames, not assumed from the generator.
6. Normalize frames with one shared scale and bottom-center anchor. Preserve source masters, extracted frames, runtime frames, runtime strip, spaced review master, and preview separately. For projectile frames, widen the runtime frame rather than shrinking the character until the effect fits.
7. Assemble the runtime strip only from independently verified frames. Use `scripts/assemble_strip.sh` when FFmpeg is available. The 50 px source/review gap must be removed when packing the runtime strip, so runtime slots remain contiguous and CSS `background-size`/`steps()` indexing stays correct. Preserve a separate 50 px-gapped source or review master; do not use it as the runtime strip.
8. Inspect each frame and the whole sequence over both light and saturated backgrounds, at source resolution and actual gameplay size. Integrate only after all quality gates pass.

## Ranged attack contract

Use the shipped ranger bow attack as the default pattern for a ranged character:

- Prefer synchronized character and projectile layers. Keep the character planted and complete; let the overlay own travel and impact.
- Preserve the causal order `anticipation → aim/charge → release → travel → contact → burst/fade`. Release starts the projectile; contact triggers damage and enemy feedback.
- Give each layer its own geometry, anchor, manifest, and bounds. Widen the projectile cell when needed instead of shrinking the character.
- Composite-test launch alignment, enemy-distance travel, contact timing, mobile readability, and reduced motion. Do not approve the two strips only in isolation.
- Share projectile art between variants only when weapon, origin, palette, and effect identity match; character strips remain exact class-and-variant assets.

When creating a bow, spell, or thrown-weapon attack, read the ranged pattern in [references/prompt-and-review.md](references/prompt-and-review.md) and inspect the ranger attack/projectile manifests plus the ranger runtime rules in `crystal-game.css`.

## Quality gates

- Exact frame count and equal runtime slots.
- Every attack and hit/knockdown generated source sheet and spaced review master has exactly 50 px of transparent gap between adjacent frames, recorded in its manifest as `sourceFrameGapPx: 50`.
- Same identity, costume, palette, facing direction, character scale, and ground line throughout.
- One complete character in every frame unless the runtime contract explicitly separates character and projectile layers.
- No cropped hair, feet, weapon, staff, cape, projectile, glow, or impact effect.
- No pixels from adjacent frames inside a frame crop; retain a meaningful transparent safety band.
- Real RGBA transparency, not a checkerboard, black rectangle, gradient, or painted matte.
- Attack anticipation, release, and final active attack pose read at gameplay size; frame 06 must not recover to idle. Hit animation must instead read as notice, impact, and complete knockdown at gameplay size.
- Ranged attacks visibly connect weapon/cast origin → release → projectile travel → contact; damage feedback occurs at contact, not at anticipation.
- Character and projectile layers preserve their own stable scale, bounds, and anchors when composited at the actual enemy distance.
- Hit reaction is clear but child-friendly: no blood, injury detail, or attacker inserted into the frame.
- Preview and in-engine playback are checked before replacing a shipped asset or changing animation indices.

Do not silently accept generation defects. Regenerate the smallest affected unit and record any deliberate exception.

## Detailed guidance

Read [references/prompt-and-review.md](references/prompt-and-review.md) when writing prompts, handling projectile spacing, diagnosing alpha problems, or preparing deliverables.
