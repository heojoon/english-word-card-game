"""Generate offline production assets; credentials are read without echo, never saved."""
import getpass
import argparse
import json
import os
from pathlib import Path
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets/audio/source/fever"
JOBS = [
    ("sfx_fever_crystal_tap_01", "sound-generation", {
        "text": "One single short magical crystal tap for a bright friendly fantasy mobile game. Immediate clean delicate glass plink, soft round attack, tiny rising shimmer, warm sparkling reward anticipation. Dry close sound, no harsh frequencies, no voice, no music, no background noise, only one tap, quick decay within half a second.",
        "duration_seconds": 0.5, "prompt_influence": 0.7,
        "model_id": "eleven_text_to_sound_v2", "loop": False,
    }),
    ("sfx_fever_crystal_pop_01", "sound-generation", {
        "text": "One single satisfying magical crystal reward pop for a cheerful fantasy mobile game. Immediate soft juicy pop with a tiny bright glass burst, ascending glittering gem chimes as treasure is collected, playful and rewarding. Compact clean isolated sound, soft friendly impact, no real glass breaking, no violence, no voice, no music, no ambience. Fast attack and short sparkling tail, one event only.",
        "duration_seconds": 0.7, "prompt_influence": 0.7,
        "model_id": "eleven_text_to_sound_v2", "loop": False,
    }),
]

MUSIC_JOB = ("bgm_fever_crystal_bonus_loop", "music", {
    "prompt": "Instrumental seamless looping bonus fever-time background music for Crystal Quest, a bright polished fantasy learning game for children. Joyful treasure shower, collecting magical crystals and winning bonus after bonus. 144 BPM, buoyant four-on-the-floor groove, bouncy warm bass, sparkling celesta and marimba runs, playful pizzicato strings, bright piano hooks, light handclaps and crisp soft drums. Catchy uplifting major-key melody, energetic and lighthearted, polished modern game soundtrack, not retro chiptune. Start the full groove immediately, maintain consistent excitement and tempo throughout, no slow intro, no cinematic build-up, no breakdown, no final cadence, no fade out. Compose a sixteen-bar repeatable musical loop with an ending that flows naturally back to its opening. Leave room for frequent crystal tap and reward sound effects, no piercing treble, no vocals or speech. Duration 26.667 seconds.",
    "music_length_ms": 26667, "force_instrumental": True,
    "model_id": "music_v2_5",
})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--music", action="store_true", help="Generate only fever BGM")
    args = parser.parse_args()
    key = os.environ.get("ELEVENLABS_API_KEY") or getpass.getpass("ElevenLabs API key (hidden): ")
    OUT.mkdir(parents=True, exist_ok=True)
    for name, endpoint, body in ([MUSIC_JOB] if args.music else JOBS):
        target = OUT / f"{name}.mp3"
        if target.exists():
            print(f"Already generated: {name}", flush=True)
            continue
        request = urllib.request.Request(
            f"https://api.elevenlabs.io/v1/{endpoint}?output_format=mp3_44100_128",
            data=json.dumps(body).encode(),
            headers={"xi-api-key": key, "Content-Type": "application/json"},
        )
        print(f"Generating {name}...", flush=True)
        try:
            with urllib.request.urlopen(request, timeout=240) as response:
                data = response.read()
                content_type = response.headers.get("Content-Type", "")
            if "audio" not in content_type or len(data) < 1000:
                raise RuntimeError("Response was not a usable audio asset")
            target.write_bytes(data)
            (OUT / f"{name}.json").write_text(json.dumps({
                "provider": "ElevenLabs", "endpoint": endpoint,
                "request": body, "source": target.name,
                "output_format": "mp3_44100_128",
                "review": "Generated; requires audio processing and listening review",
            }, indent=2), encoding="utf-8")
            print(f"Saved {name} ({len(data)} bytes)", flush=True)
        except urllib.error.HTTPError as error:
            try:
                detail = json.loads(error.read()).get("detail", {})
                status = detail.get("status", "request_rejected") if isinstance(detail, dict) else "request_rejected"
            except (ValueError, AttributeError):
                status = "request_rejected"
            print(f"Generation stopped: HTTP {error.code}, {status}", flush=True)
            return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
