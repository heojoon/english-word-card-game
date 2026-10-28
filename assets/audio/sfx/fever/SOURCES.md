# Fever crystal effects

Generated with ElevenLabs `eleven_text_to_sound_v2` on 2026-10-28.
Original MP3 responses and complete request prompts are kept separately in
`assets/audio/source/fever/`. No credentials are stored in these assets.
`scripts/generate-fever-audio.py` generates these two SFX by default; `--music`
generates fever BGM separately. Existing originals are skipped. It reads
`ELEVENLABS_API_KEY` or prompts without echo.

| Runtime file | Event | Interaction | Processing |
| --- | --- | --- | --- |
| `sfx_fever_crystal_tap_01.wav` | `FEVER_CRYSTAL_TAP` | First press reveals the meaning | Leading silence trimmed at -55 dB; +12 dB gain; 2 ms attack / 12 ms tail fade |
| `sfx_fever_crystal_pop_01.wav` | `FEVER_CRYSTAL_POP` | Second press starts the pop and awards one crystal | Leading silence trimmed at -55 dB; +3 dB gain; 2 ms attack / 15 ms tail fade |

Runtime: mono 48 kHz, 16-bit PCM WAV. The originals are lossy service output,
so converting to WAV does not make them lossless generation masters.
Both effects leave peak headroom; event gains and slight pitch/gain variation
are set by the audio manifest and the existing SFX bus.
Story battle entry preloads both assets, including the hidden fever challenge.
Paused/finished/expired battles and already popped crystals do not emit SFX.

Review: audio decoding, duration, signal levels, event behavior and build checked
automatically; listening and browser review have not been performed.
Fever BGM provenance and processing are documented in
`assets/audio/bgm/fever/SOURCES.md`.
