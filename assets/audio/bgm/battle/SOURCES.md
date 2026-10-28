# Normal monster battle music

Generated with ElevenLabs `music_v2_5` on 2026-10-29 for the user's request for
urgent normal-monster battle BGM. The complete prompt and original 48 kHz,
192 kbps MP3 response are preserved in
`assets/audio/source/battle/bgm_battle_word_crystal_loop.{mp3,json}`.
No lossless generation master was supplied by this MP3 request.

Direction: fast fantasy orchestral combat; spiccato strings, woodwinds,
toms/snare, warm bass and crystal celesta. Instrumental, child-friendly,
medium-high intensity, with space for vocabulary speech and combat effects.
The prompt requests 144 BPM and 32 repeatable bars; these are generation
intentions and have not been confirmed by listening review.

Processing: FFmpeg 25 Hz high-pass, -3.12 dB gain (source measured -12.88 LUFS,
-0.49 dBTP), trim to 2,560,000 samples / 53.333333 seconds at 48 kHz, stereo.
Apply 4 ms fades to both edges to reduce waveform discontinuity at the loop.
Ship Vorbis quality 4 with 128 kbps MP3 fallback. Decode, duration, signal
headroom and endpoints are checked technically; musical continuity and
listening quality are not claimed as reviewed or user-approved.

Runtime: `BATTLE_BGM` at event gain 0.5, looping through the shared SoundManager.
Used for ordinary Story and Survival combat, respecting existing volume,
mute, input unlock and pause/resume behavior. Boss and fever states switch
to their dedicated music. Existing 350 ms transitions are retained.

Reproduce generation with `python scripts/generate-battle-audio.py` after
securely providing `ELEVENLABS_API_KEY` in the environment. Existing originals
are skipped; credentials are not included in source or runtime assets.
