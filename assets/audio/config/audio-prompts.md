# Wordoria Crystal Quest audio generation prompts

The prompts below describe the audio direction. Fever, normal-battle and boss-battle music have been generated with ElevenLabs; complete requests and original responses are stored under `assets/audio/source/`. Runtime processing and review status are recorded in each shipped family's `SOURCES.md`. Other entries remain specifications unless a source record says otherwise. Credentials are never included in these records.

## BGM

### Main menu

Sound description: A welcoming crystal-fantasy main-menu theme with celesta, soft marimba, warm strings, airy pads, and tiny glass chimes; a memorable but non-distracting melody for young learners. Style: polished bright mobile fantasy RPG, friendly, magical, no vocals, no copyrighted melody. Duration: 75 seconds. Intensity: low to medium, calm forward motion. Audio quality: clean stereo, 48 kHz, wide but mobile-speaker readable, controlled transients, -16 LUFS target, seamless endpoints. Loop: yes, seamless musical loop at a four-bar boundary.

### Normal battle

Generated direction: urgent normal-monster combat with driving spiccato strings, agile woodwinds, tight toms/snare, warm bass, celesta and crystal bells. Bright modern fantasy RPG, instrumental, tense but hopeful, with space for speech and combat effects. Requested tempo: 144 BPM; duration: 53.333 seconds / 32 bars. Target: stereo 48 kHz, approximately -16 LUFS, controlled peaks, immediate groove and repeatable endpoints. Complete prompt: `assets/audio/source/battle/bgm_battle_word_crystal_loop.json`.

### Boss battle

Generated direction: majestic, intensely urgent boss combat with layered orchestral brass, string ostinatos, powerful timpani/toms and bright crystal arpeggios. Heroic premium fantasy RPG, instrumental, high sustained intensity with room for speech and skill effects. Requested tempo: 150 BPM; duration: 51.2 seconds / 32 bars. Target: stereo 48 kHz, approximately -16 LUFS, controlled peaks, immediate full arrangement and repeatable endpoints. Complete prompt: `assets/audio/source/boss/bgm_boss_crystal_guardian_loop.json`.

### Victory

Sound description: A joyful stage-clear fanfare that rises through sparkling crystal chimes, warm strings, and a short heroic cadence, leaving a clean tail for the reward screen. Style: bright collectible fantasy RPG reward cue. Duration: 5 seconds. Intensity: medium-high celebratory burst. Audio quality: clean stereo, 48 kHz, crisp transients, no clipping. Loop: no.

### Defeat

Sound description: A gentle try-again cue with descending soft marimba, muted strings, and one hopeful crystal note at the end; disappointing but reassuring for young learners. Style: friendly educational fantasy RPG, never ominous. Duration: 4 seconds. Intensity: low-medium. Audio quality: clean stereo, 48 kHz, clear mobile playback, smooth tail. Loop: no.

## SFX

### Light punch attack

Sound description: A fast airy fist whoosh with a small magical violet sparkle at release, no body impact. Style: stylized child-friendly fantasy combat. Duration: 0.35 seconds. Intensity: medium-light. Audio quality: mono-compatible, 48 kHz, dry, crisp, no clipping. Loop: no. Generate three subtly different takes.

### Heavy punch attack

Sound description: A weighty glove swing with a low cloth whoosh and compact crystal charge, ending before contact; no bone or injury sound. Style: polished arcade-fantasy combat, child-friendly. Duration: 0.55 seconds. Intensity: high. Audio quality: mono-compatible, 48 kHz, strong midrange, controlled bass. Loop: no. Generate two different takes.

### Punch hit

Sound description: A compact padded impact layered with a bright crystal crackle and tiny shard burst, satisfying but non-realistic, no gore. Style: colorful mobile fantasy RPG. Duration: 0.4 seconds. Intensity: medium-high. Audio quality: mono-compatible, 48 kHz, punchy transient with short tail. Loop: no. Generate three variations.

### Critical hit

Sound description: A powerful stylized impact with a deep magical thump, crystalline snap, rising shimmer, and brief reward sparkle. Style: premium mobile RPG critical feedback, exciting and child-safe. Duration: 0.8 seconds. Intensity: very high without distortion. Audio quality: stereo, 48 kHz, clean headroom and mobile-readable mids. Loop: no. Generate two variations.

### Special move

Sound description: A violet-and-mint crystal energy charge, rapid magical sweep, decisive release, and sparkling tail; leave the separate contact impact to another sound. Style: heroic polished fantasy skill cue. Duration: 1.2 seconds. Intensity: high, rising arc. Audio quality: stereo, 48 kHz, detailed but uncluttered. Loop: no. Generate two variations.

### Jump

Sound description: A short light cloth lift with a playful airy magical puff. Style: friendly SD/chibi fantasy movement. Duration: 0.25 seconds. Intensity: low. Audio quality: mono-compatible, 48 kHz, clean and dry. Loop: no.

### Landing

Sound description: A soft boot landing with a small dust puff and faint crystal tick, no heavy crash. Style: friendly SD/chibi fantasy movement. Duration: 0.3 seconds. Intensity: low-medium. Audio quality: mono-compatible, 48 kHz, compact transient. Loop: no.

### Character death

Sound description: A soft magical knockdown cue with a muted impact, fading sparkle, and gentle descending tone; communicates defeat without pain, injury, or fear. Style: child-friendly fantasy RPG. Duration: 1.1 seconds. Intensity: medium. Audio quality: stereo-compatible, 48 kHz, smooth tail. Loop: no.

### Button click

Sound description: A tiny polished crystal tap with a soft rounded tick, quick and unobtrusive. Style: clean bright mobile game UI. Duration: 0.08 seconds. Intensity: low. Audio quality: mono-compatible, 48 kHz, no noise floor or tail. Loop: no. Generate two subtle variations.

### Item acquired

Sound description: A sparkling three-note crystal pickup with a warm coin-like accent and a short upward shimmer. Style: rewarding collectible fantasy RPG. Duration: 0.9 seconds. Intensity: medium-high and cheerful. Audio quality: stereo, 48 kHz, crisp and clean with headroom. Loop: no.
