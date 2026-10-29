"""Generate original lobby tracks. Credentials are read only from the environment."""
import json
import os
from pathlib import Path
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
COMMON = (
    "Original instrumental phonk background music for Crystal Quest, a bright crystal-fantasy "
    "vocabulary RPG for young learners. Recognizable melodic cowbell hook, syncopated tight "
    "808 bass, punchy kicks, crisp claps and rolling hi-hats, with sparkling crystal bells "
    "and warm atmospheric synth chords. Polished stereo mix, moderate intensity, controlled "
    "bass and smooth treble, readable on mobile speakers, leave room for UI sounds. "
    "No vocals, rap, speech, vocal samples, profanity, horror, harsh clipping or sirens. "
    "Begin immediately with the groove. Maintain a repeatable 32-bar phrase, no silent intro, "
    "no final cadence or fade-out. Last bar leads harmonically and rhythmically into the first "
    "bar for continuous looping. "
)
JOBS = [
    ("crystal_drive", "크리스털 드라이브", 128, 60000,
     "Uplifting melodic drift phonk at 128 BPM, confident playful home-menu energy, "
     "violet neon sparkle, catchy cowbell melody over hopeful minor-to-major chord lifts."),
    ("moonlight_drift", "문라이트 드리프트", 120, 64000,
     "Dreamy chill phonk at 120 BPM for relaxed world-map exploration. Floating lavender "
     "pads, mellow cowbell motifs, warm rounded 808 slides, spacious moonlit adventure mood."),
    ("mint_horizon", "민트 호라이즌", 112, 68571,
     "Bouncy atmospheric phonk at 112 BPM for a sunny fantasy journey. Mint crystal chimes, "
     "syncopated cowbell call and response, warm airy chords, laid-back adventurous groove."),
]


def main():
    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        raise SystemExit("ELEVENLABS_API_KEY is required in the environment.")
    folder = ROOT / "assets/audio/source/lobby"
    folder.mkdir(parents=True, exist_ok=True)
    for slug, title, bpm, duration, style in JOBS:
        name = f"bgm_lobby_{slug}_loop"
        target = folder / (name + ".mp3")
        if target.exists():
            print("Already generated: " + name, flush=True)
            continue
        prompt = COMMON + style + f" Target duration {duration / 1000:.3f} seconds."
        body = {"prompt": prompt, "music_length_ms": duration,
                "force_instrumental": True, "model_id": "music_v2_5"}
        request = urllib.request.Request(
            "https://api.elevenlabs.io/v1/music?output_format=mp3_48000_192",
            data=json.dumps(body).encode(),
            headers={"xi-api-key": key, "Content-Type": "application/json"})
        print("Generating " + name, flush=True)
        try:
            with urllib.request.urlopen(request, timeout=300) as response:
                data = response.read()
                if "audio" not in response.headers.get("Content-Type", "") or len(data) < 10000:
                    raise RuntimeError("Response was not usable audio")
        except urllib.error.HTTPError as error:
            raise SystemExit(f"Music service returned HTTP {error.code}") from None
        target.write_bytes(data)
        target.with_suffix(".json").write_text(json.dumps({
            "title": title, "provider": "ElevenLabs Music", "model": "music_v2_5",
            "prompt": prompt, "bpm": bpm, "requestedDurationMs": duration,
            "source": target.name, "format": "mp3_48000_192",
            "review": "Generated original; technical processing and listening review pending."
        }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Saved {name} ({len(data)} bytes)", flush=True)


if __name__ == "__main__":
    main()
