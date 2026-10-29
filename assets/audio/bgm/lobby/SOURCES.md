# Home and world phonk playlist

Three original instrumentals generated with ElevenLabs Music `music_v2_5` on
2026-10-29 for the user's home/world phonk request:

| Event | Title | Requested BPM | Loop duration |
| --- | --- | --- | --- |
| PHONK_CRYSTAL_BGM | 크리스털 드라이브 | 128 | 60 seconds |
| PHONK_MOONLIGHT_BGM | 문라이트 드리프트 | 120 | 64 seconds |
| PHONK_MINT_BGM | 민트 호라이즌 | 112 | 68.571 seconds |

Direction: melodic cowbell hooks, syncopated 808 bass, crisp drums and crystal
bells. Instrumental, moderate intensity, smooth treble, no voice samples.
The requested BPMs are prompt intentions, not measured tempo confirmations.

Original 48 kHz / 192 kbps MP3 service responses and full generation prompts
are preserved separately in `assets/audio/source/lobby/`. The service did not
provide lossless masters. Each adjacent runtime JSON records the complete
prompt, source loudness measurements and exact processing filters.

Processing: FFmpeg high-pass at 25 Hz, two-pass loudness normalization targeting
-16 LUFS / -1.5 dBTP, trim to requested duration, 8 ms fades at both loop edges
to reduce discontinuities. Runtime formats are 48 kHz stereo Vorbis quality 4
and 128 kbps MP3 fallback. Musical seam and listening approval remain pending;
technical checks do not represent user approval.

Technical verification: all six runtime files decode successfully. Measured
integrated loudness is -16.41 to -16.03 LUFS; decoded true peaks are -3.87 to
-3.45 dBTP. These measurements include the final Vorbis/MP3 encoding.

Generate with `python scripts/generate-lobby-phonk.py` after securely supplying
`ELEVENLABS_API_KEY` through the environment. Existing originals are skipped.
Export with `python scripts/process-lobby-phonk.py` (requires FFmpeg).
Credentials are never stored in prompts, metadata, runtime assets or bundles.

The manifest exposes these tracks plus the existing home and forest songs.
The default is Crystal Drive. The player's choice, volume and BGM mute persist
through SoundManager settings. Automatic mode restores screen-specific music.
Battle, boss, fever and result audio retain their dedicated routing.
