# Crystal bonus fever BGM

Generated with ElevenLabs `music_v2_5` on 2026-10-28 after the user enabled paid
Music API access. Original MP3 and the complete generation request are in
`assets/audio/source/fever/bgm_fever_crystal_bonus_loop.{mp3,json}`.
Reproduction: `python scripts/generate-fever-audio.py --music` (skips existing
originals). The API key is never stored in source or runtime files.

Direction: instrumental, bright fantasy treasure shower; 144 BPM, major-key
melody, bouncy bass, celesta/marimba, pizzicato strings and light percussion.
The prompt requests a sixteen-bar phrase with an immediate groove and no outro.
These are generation intentions; tempo and musical seam still need listening review.

Processing with FFmpeg: 25 Hz high-pass, -3 dB gain (original measured -13.09
LUFS / -0.84 dBTP), trim to 26.666667 seconds (16 bars at the requested tempo),
4 ms fades at both edges to reduce waveform clicks; stereo 48 kHz.
Ship Vorbis quality 4 with MP3 128 kbps fallback. No lossless generation master
was provided by this request; the original service response is MP3.

Event: `FEVER_BGM`, looping, event gain 0.48, existing BGM/master volume and mute
settings. Both normal and hidden fever battles use it, switching from ordinary
music when fever begins and switching to the existing result music on exit.
Existing pause/resume behavior preserves the playback position.

Review: decoding, signal headroom, loop duration, runtime routing, transition
deduplication/cancellation and build checked automatically. Listening and browser
review have not been performed; no user approval of musical quality is claimed.
