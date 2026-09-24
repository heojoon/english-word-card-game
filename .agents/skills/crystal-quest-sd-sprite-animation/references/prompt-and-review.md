# Prompt and review guide

This guide distills the successful Wordoria mage and warrior animation sessions and the failures that required rework.

## Prompt structure

Give the image model, in order:

1. **Intended use** — production sprite for a mobile-first 2D browser RPG.
2. **Canonical identity** — exact face, hair, costume colors and motifs, class prop, age tone, and proportions from the attached reference.
3. **Output geometry** — horizontal strip or isolated frame, exact frame count, equal slots, direction, full-body requirement, stable ground line, transparent safety margins, and an exact 50 px transparent gap between adjacent frames in every attack or hit/knockdown generated source sheet or review master.
4. **Frame beats** — one concrete pose/action per numbered frame. Standard hit/knockdown assets use exactly three frames: guard/notice, impact/strongest recoil, and complete knockdown with a final-frame hold.
5. **Effect behavior** — effect origin, whether detached, travel direction and distance, size, and fade. State that a projectile is not a continuous beam when applicable.
6. **Style** — polished SD/chibi Crystal Quest art, clean anime-inspired rendering, clear silhouette at 128 px, no pixel art.
7. **Negative constraints** — no scenery, floor, labels, guides, borders, poster layout, extra character, duplicate limb, crop, black background, painted checkerboard, violence, or gore.

Do not ask the model merely to “make an attack animation.” The pose sequence and spatial behavior must be explicit.

## Reusable prompt skeleton

```text
Image 1 is the canonical identity and costume reference.

Create <one isolated frame | one horizontal N-frame strip> for a production
mobile-first 2D browser RPG. Preserve the exact same <identity details>,
<costume>, <prop>, palette, youthful nonsexualized proportions, and
<right/left>-facing direction.

Style: polished SD/chibi Crystal Quest 2D fantasy art, large readable head and
hands, compact body, crisp silhouette at 128 px, not pixel art.

Geometry: <N equal slots / one frame>, full body and complete prop visible,
stable ground line and scale, bottom-center character anchor, generous genuine
transparent margins. For an attack or hit/knockdown multi-frame generated
source sheet, place exactly 50 px of fully transparent gap between every
adjacent frame. No foreground pixel may touch or cross a slot boundary or the
50 px gap.

Frame beats:
1. ...
2. ...
...

For a six-frame attack, Frame 06 must be a readable active attack or impact
pose, never recovery or return-to-idle.

Effect: <origin, detached/attached state, travel, bounds, fade>.

No scenery, floor, labels, text, guides, borders, extra characters, duplicate
body parts, cropped hair/feet/prop/effect, black background, painted
checkerboard, or poster composition. Production game asset, not concept art.
```

## Choosing strip-first or isolated generation

Strip-first usually preserves motion and identity better, so try it for compact melee attacks and hit reactions. Switch to smaller groups or isolated frames when one of these occurs:

- a projectile needs more than one character-width of travel;
- a staff, sword, cape, hair, or glow crosses a slot boundary;
- a slot contains only the projectile and the character disappears;
- extraction includes a neighbor pose;
- removing neighbor pixels would also remove the intended effect.

## Standard hit/knockdown contract

Use three equal 320 × 320 runtime cells and a bottom-center anchor (`x: 0.5`, `y: 0.975`) unless the character silhouette requires a wider documented cell.

1. `guard-notice`: upright, clearly aware of incoming danger.
2. `impact-recoil`: strongest child-friendly recoil; emit the gameplay `hit` event here.
3. `knockdown`: fully down on the ground with no recovery motion; set `finalHold: true` and retain the frame until the battle state changes.

Configure a three-frame CSS strip with `background-size: 300% 100%`, animate from `background-position: 0` to `100%`, and use `steps(2, end)`. Do not rotate an already prone final-frame drawing with a container-level fall transform.

When using isolated generation, attach the same canonical reference every time, repeat the invariant identity description, keep the canvas and anchor contract identical, and compare all results side-by-side before normalization.

## Proven ranged pattern: ranger bow shot

The shipped ranger demonstrates the preferred two-layer solution for ranged attacks:

```text
character:  ready → anticipation → draw → full_draw → release → attack_peak
projectile: charge → launch → near_travel → far_travel → contact → crystal_burst
event:                                             release ────────► hit
```

Its character baseline is six 320 × 320 bottom-centered cells (`x: 0.5`, `y: 0.975`) timed `140, 110, 110, 130, 90, 180 ms`. The projectile baseline is six independently centered cells (`x: 0.5`, `y: 0.5`) timed `90, 100, 100, 100, 90, 180 ms`. Treat these as a proven starting rhythm, not a mandatory duration for every weapon.

Generate and review these layers separately, then review them again as one composite timeline. The character strip owns identity, pose, weapon handling, and the release cue. The projectile strip owns screen-space travel, contact, and the terminal burst. This prevents the character from disappearing in travel frames and avoids oversized strips where arrows, magic bolts, or thrown weapons contaminate adjacent cells.

For a bow user, explicitly require consistent bow shape and grip, a believable hand-to-string relationship, a clear full-draw silhouette, and a visible release change. Do not require the flying arrow to remain inside the character cell after release. For a caster or thrown-weapon user, substitute `charge/aim/release` poses while keeping the same causal sequence.

Projectile prompts should specify:

- exact left-to-right or right-to-left travel direction;
- launch origin and the point at which the effect becomes detached;
- a readable leading edge and a short trailing effect;
- increasing travel distance without changing projectile identity or scale unexpectedly;
- one bounded contact frame followed by a burst or fade;
- no character, scenery, floor, target enemy, continuous beam, or cropped glow.

At integration time, map the release cue to projectile start and the projectile contact event to actual damage. Verify the launch point at narrow and wide mobile arena sizes because a fixed overlay offset that looks correct in one viewport can detach from the weapon in another.

For six-frame CSS strips, use `background-size: 600% 100%` and animate from `background-position: 0` through `100%` with `steps(5, end)`. Frame 06 remains the character's active attack peak, not a recovery. Delay the projectile so `launch` aligns with the character's `release`, translate the overlay toward the current enemy distance, and synchronize enemy reaction, sound, and haptics to projectile `contact`. If a legacy character manifest labels release with `hit: true`, interpret that as a launch cue; projectile contact remains the authoritative ranged-impact event.

Under `prefers-reduced-motion`, shorten wind-up and flight but retain release, visible direction, contact, and enemy feedback. A projectile-only frame must never replace a character frame, and a continuous beam is valid only when the class design explicitly calls for one.

## Alpha and spacing

An RGBA file can still contain an opaque painted background. Verify alpha numerically and visually over at least two contrasting colors. Background-removal edits sometimes redraw or retain gradients; reject those outputs if foreground identity or glow edges change.

For safe extraction, foreground bounds must not touch slot edges. Every attack and hit/knockdown generated source sheet and review master uses a fixed **50 px fully transparent gap** between adjacent frames; record `sourceFrameGapPx: 50` in its manifest. The gap is an inter-frame separator, not part of a runtime frame and not a substitute for each frame's own safety margin. Runtime strips normally remain tightly packed in equal slots after the 50 px gaps are removed; the gapped master is an archival/re-extraction asset.

Crop only after inspecting foreground bounds. Edge masking is acceptable only for confirmed stray neighbor pixels in a transparent safety band. Never erase a legitimate projectile, prop tip, hair, or glow merely to make dimensions pass.

## Deliverables

Keep these distinct:

```text
source/                       generation originals
source-frames/<action>/       lossless extracted/approved frames
<action>/01.png ... NN.png    normalized runtime frames
char_<id>_<action>_strip.png  tightly packed runtime strip
review/*_spaced_master.png    wide-slot archival master
review/*_preview.png          labeled or stacked review image
```

Use repository naming conventions when they differ. Do not overwrite approved runtime assets until the preview and in-engine playback pass.

## Review checklist

Review frame-by-frame, then as motion:

- identity drift in face, hair, outfit, prop, hands, and color accents;
- scale pumping or vertical foot jitter;
- reversed facing direction;
- missing character or detached body part;
- adjacent-frame contamination;
- cropped effect or misleading continuous beam;
- fake transparency or dark alpha halo;
- action timing: readable anticipation, release, and a final active attack or impact pose (never recovery in frame 06);
- readability on a portrait mobile battle HUD.

If a defect is local, regenerate the smallest affected frame/group. If identity or scale drift affects most frames, restart from the canonical reference rather than iterating on the flawed strip.
