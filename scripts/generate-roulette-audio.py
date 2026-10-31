"""Generate the requested roulette audio using the project's ElevenLabs key.

Original MP3s and complete prompts stay separate from processed runtime assets.
Never prints the key, API response bodies, or local configuration.
"""
import concurrent.futures
import json
import os
from pathlib import Path
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets/audio/source/roulette"
JOBS = [
    ("bgm_fever_roulette_loop", "music", {
        "prompt": "Instrumental seamless 16-bar loop for a colorful crystal fantasy prize wheel in a children's learning game. 120 BPM, 32 seconds. Playful suspense and joyful anticipation, sparkling celesta arpeggios, pizzicato strings, bouncy soft bass, light modern drums, bright warm brass accents. Catchy polished casual fantasy game music, full groove from the first beat, consistent energy. End flows into the opening without cadence or fade. Leave space for wheel clicks and button sound effects. No vocals, no speech, no chiptune, no harsh treble.",
        "music_length_ms": 32000, "force_instrumental": True, "model_id": "music_v2_5",
    }),
    ("bgm_roulette_cheer_fanfare", "music", {
        "prompt": "A short triumphant prize reveal fanfare for a bright crystal fantasy children's game, 6 seconds. Immediate sparkling magical reveal, celebratory brass and strings, glistening crystal chimes, punchy warm drums and a joyful crowd cheering wordlessly 'yay' in the background. An exciting winning moment, friendly and uplifting, polished game soundtrack. Strong opening, clear resolving ending, natural short reverb tail. No lyrics or spoken words, no harsh sounds, no chiptune.",
        "music_length_ms": 6000, "model_id": "music_v2_5",
    }),
    ("sfx_roulette_wheel_tick_01", "sound-generation", {
        "text": "One crisp tactile wooden and metallic prize wheel pointer tick, a soft mechanical ratchet click with a tiny crystal sparkle. Friendly fantasy game UI. Single isolated click, immediate onset, very short decay, no music, no ambience, no voices.",
        "duration_seconds": 0.5, "prompt_influence": 0.7, "model_id": "eleven_text_to_sound_v2",
    }),
    ("sfx_roulette_red_button_01", "sound-generation", {
        "text": "Single satisfying press of a big red arcade game button: rounded spring-loaded plastic clack, soft low mechanical thump and short spring return. Tactile, punchy but gentle, isolated clean studio sound, immediate onset, no music, no voices, no repeated presses.",
        "duration_seconds": 0.5, "prompt_influence": 0.7, "model_id": "eleven_text_to_sound_v2",
    }),
    ("sfx_roulette_blank_01", "sound-generation", {
        "text": "A gentle playful oops game-show prize wheel miss cue, soft descending marimba bloop and tiny wooden plop, sympathetic and humorous for children, not sad or alarming, immediate onset, clean short ending. No voices, no background ambience.",
        "duration_seconds": 1.2, "prompt_influence": 0.7, "model_id": "eleven_text_to_sound_v2",
    }),
]


def generate(job, key):
    name, endpoint, body = job
    target = OUT / f"{name}.mp3"
    if target.exists():
        return f"Already generated: {name}"
    request = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/{endpoint}?output_format=mp3_44100_128",
        data=json.dumps(body).encode(),
        headers={"xi-api-key": key, "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=240) as response:
            data = response.read()
            content_type = response.headers.get("Content-Type", "")
        if "audio" not in content_type or len(data) < 1000:
            raise RuntimeError("Response was not a usable audio asset")
        target.write_bytes(data)
        (OUT / f"{name}.json").write_text(json.dumps({
            "provider": "ElevenLabs", "endpoint": endpoint, "request": body,
            "source": target.name, "output_format": "mp3_44100_128",
            "review": "Generated; runtime processing validated, listening review pending",
        }, indent=2), encoding="utf-8")
        return f"Generated {name} ({len(data)} bytes)"
    except urllib.error.HTTPError as error:
        raise RuntimeError(f"{name}: generation HTTP {error.code}") from None
    except urllib.error.URLError:
        raise RuntimeError(f"{name}: audio service connection unavailable") from None


def main():
    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        for line in (ROOT / ".env.local").read_text(encoding="utf-8-sig").splitlines():
            if line.strip().startswith("ELEVENLABS_API_KEY="):
                key = line.split("=", 1)[1].strip().strip('"\'')
    if not key:
        raise SystemExit("ELEVENLABS_API_KEY is unavailable")
    OUT.mkdir(parents=True, exist_ok=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        futures = [pool.submit(generate, job, key) for job in JOBS]
        for future in concurrent.futures.as_completed(futures):
            print(future.result(), flush=True)


if __name__ == "__main__":
    main()
