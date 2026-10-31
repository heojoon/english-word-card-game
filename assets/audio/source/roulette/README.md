# Roulette audio production

Generated with ElevenLabs on 2026-10-31 for the World 8 fever roulette request. Each adjacent JSON records the complete prompt, model, endpoint, original filename, and generation review status. Originals are separate from browser assets and excluded from Capacitor staging.

Runtime files:

- `assets/audio/bgm/roulette/bgm_fever_roulette_loop.{ogg,mp3}` — 120 BPM, sixteen bars, trimmed to 32 seconds before encoding; loop enabled.
- `assets/audio/bgm/roulette/bgm_roulette_cheer_fanfare.{ogg,mp3}` — six-second cheering fanfare; one-shot BGM on a winning reveal.
- `assets/audio/sfx/roulette/sfx_roulette_wheel_tick_01.wav` — pointer click at sector crossings.
- `assets/audio/sfx/roulette/sfx_roulette_red_button_01.wav` — start and stop presses.
- `assets/audio/sfx/roulette/sfx_roulette_blank_01.wav` — gentle blank-result cue.

Processing: ffmpeg 8.1.1, 48 kHz; BGM `loudnorm=I=-18:TP=-2:LRA=9`, libvorbis/libmp3lame quality 4. The loop has 15 ms entrance / 30 ms exit fades and `atrim=duration=32` after normalization. SFX remove leading silence at -48 dB, normalize to -20 LUFS / -3 dBTP, and use a 3 ms entrance fade; shipped as PCM16 WAV. Masters retain the generator's original MP3 quality (a lossless generation master was not available in this request).

Verified: all runtime assets decode, their manifest paths exist, the music loop is trimmed to its bar boundary, fanfare does not loop, state tests exercise music transitions and pause, and the build includes runtime files while excluding these originals.

Listening and browser review: pending; neither automated waveform checks nor code review constitute listening review or user approval.
