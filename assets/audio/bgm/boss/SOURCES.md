# Boss battle music

Generated with ElevenLabs `music_v2_5` on 2026-10-29 for the user's request for
majestic, urgent boss-stage BGM. The complete prompt and original 48 kHz,
192 kbps MP3 response are preserved in
`assets/audio/source/boss/bgm_boss_crystal_guardian_loop.{mp3,json}`.
No lossless generation master was supplied by this MP3 request.

Direction: grand heroic orchestral confrontation; layered brass, driving
strings, powerful timpani/toms and shimmering crystal arpeggios. Instrumental,
high intensity, child-friendly, with room for spoken vocabulary and effects.
The prompt requests 150 BPM and 32 repeatable bars; these are generation
intentions and have not been confirmed by listening review.

Processing: FFmpeg 25 Hz high-pass, -3.13 dB gain (source measured -12.87 LUFS,
-0.31 dBTP), trim to 2,457,600 samples / 51.2 seconds at 48 kHz, stereo.
Apply 4 ms fades to both edges to reduce waveform discontinuity at the loop.
Ship Vorbis quality 4 with 128 kbps MP3 fallback. Decode, duration, signal
headroom and endpoints are checked technically; musical continuity and
listening quality are not claimed as reviewed or user-approved.

Runtime: `BOSS_BGM` at event gain 0.55, looping through the shared SoundManager.
Used for Royal Slime, guardian-based bosses, Crystal Ghost, Keurus, the hidden
Crystal King and Survival's final boss question. Fever takes precedence.
Existing master/BGM volume, mute, input unlock, pause/resume and 350 ms
transitions are retained. Story dialogue/exploration keeps its forest music.

Reproduce generation with `python scripts/generate-battle-audio.py` after
securely providing `ELEVENLABS_API_KEY` in the environment. Existing originals
are skipped; credentials are not included in source or runtime assets.
