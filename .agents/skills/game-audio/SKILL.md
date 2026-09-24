---
name: game-audio
description: Design, implement, integrate, and validate BGM, combat/UI SFX, voice, and browser audio behavior for Wordoria Crystal Quest. Use for game-audio assets, prompts, event timing, volume settings, or SoundManager changes in this repository.
---

# Wordoria game audio

Build audio as a gameplay-feedback system without changing graphics, animation, or balance. Preserve the repository's vanilla JavaScript architecture and use `assets/audio/config/audio-manifest.json` as the stable event-to-asset boundary.

## Required context

Before editing, inspect `ART_DIRECTION.md`, the battle flow in `GAME_DESIGN.md`, the current `crystal-game.js` event timing, sprite manifests, and existing audio code. Treat sprite contact metadata and shipped CSS timings as authoritative. Input time and contact time are different: play an attack cue when motion starts, but play hit/damage cues only at contact.

## Workflow

1. Inventory the runtime, build pipeline, existing audio, gameplay state owner, and animation timing.
2. Keep buses `master -> {bgm, sfx}`. Voice may be added as its own bus when recorded voice assets exist. Persist normalized `0..1` volumes and mute state; clamp all public inputs.
3. Use stable uppercase event IDs. Gameplay emits events and never embeds audio paths. Missing files must be a recoverable no-op with a deduplicated warning.
4. For repeated SFX, rotate through variants without immediate repetition and add subtle pitch/gain variation. Permit overlapping one-shots and release decoded buffers and source references when no longer needed.
5. BGM loops by default, crossfades on screen/state changes, pauses on hidden/native pause where appropriate, and resumes only after a user gesture has unlocked Web Audio.
6. On touch browsers, register one-shot `pointerdown`, `touchend`, and `keydown` unlock handlers. Do not autoplay before consent or a user gesture.
7. Validate missing-resource boot, concurrent one-shots, looping, fades, volume persistence, mute/unmute, unlock, contact-frame timing, and cleanup. Run the repository build.

## Asset production

- Naming: lowercase snake case, semantic family, two-digit variant: `sfx_combat_hit_punch_01.wav`, `bgm_battle_crystal_forest_loop.ogg`.
- Deliver masters as lossless WAV, 48 kHz/24-bit where the generator supports it. Ship browser BGM primarily as OGG plus MP3/AAC fallback and short SFX as optimized OGG/WAV as the measured target requires.
- Trim silence, remove DC offset/clicks, normalize consistently, leave mix headroom, and verify loop seams at zero crossings and musical bar boundaries.
- Avoid harsh, frightening, or realistic injury sounds. The audience is upper-elementary and middle-school learners; use bright crystal-fantasy materials and readable, child-friendly impacts.
- Write generation prompts in English with sound description, style, duration, intensity, quality, and loop requirement. Keep service-neutral wording suitable for ElevenLabs or Stable Audio.
- Never create placeholder audio bytes or claim generation succeeded without an attached audio-generation service. Prompts and manifest entries are production specifications, not generated audio.

## Integration contract

- `ATTACK_LIGHT`, `ATTACK_HEAVY`, `ATTACK_SPECIAL`: animation start/release cue.
- `PLAYER_HIT`, `ENEMY_HIT`, `CRITICAL_HIT`: declared impact/contact frame.
- `PLAYER_JUMP`, `PLAYER_LAND`, `PLAYER_DEATH`, `ENEMY_DEATH`: only when the corresponding gameplay transition exists.
- `GAME_VICTORY`, `GAME_DEFEAT`: settled battle result, once per run.
- `UI_CLICK`, `UI_CONFIRM`, `UI_CANCEL`: semantic UI action; avoid double-playing click plus confirm/cancel unless intentionally layered.

For the current asset list and generation specifications, read `assets/audio/config/audio-prompts.md` and `assets/audio/config/audio-manifest.json`.
