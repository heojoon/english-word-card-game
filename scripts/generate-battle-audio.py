"""Generate Crystal Quest battle music; read credentials only from the environment."""
import json
import os
from pathlib import Path
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
JOBS = [
    ("battle", "bgm_battle_word_crystal_loop", 53333,
     "Original instrumental normal-monster battle background music for Crystal Quest, a polished bright fantasy RPG for upper-elementary and middle-school learners. Urgent, fast and exciting combat momentum at 144 BPM in 4/4. Driving spiccato string ostinatos, agile woodwind phrases, tight toms and snare, warm rhythmic bass, sparkling celesta and crystal bell accents, a confident memorable adventure motif. Tense minor-key pulse with heroic hopeful lifts. Medium-high intensity, clearly more urgent than exploration music, but lighter and smaller in scale than a boss battle. Clean modern orchestral game soundtrack, no chiptune, no horror, no harsh treble, no vocals or speech. Leave space for vocabulary pronunciation and attack effects; controlled percussion and bass, mobile-speaker readable stereo mix. Begin immediately with the full combat groove, no slow introduction, no silence, no breakdown, no final cadence and no fade-out. Sustain the energy through a repeatable 32-bar phrase lasting 53.333 seconds. End on the same harmonic turnaround and rhythmic pulse that leads directly into the opening bar, designed for continuous looping."),
    ("boss", "bgm_boss_crystal_guardian_loop", 51200,
     "Original instrumental boss-stage battle background music for Crystal Quest, a polished magical fantasy RPG for upper-elementary and middle-school learners. Majestic, grand and intensely urgent heroic confrontation at 150 BPM in 4/4. Massive layered orchestral brass fanfares, driving low-string and violin ostinatos, powerful tight timpani and concert toms, confident bass, bright crystal arpeggios and shimmering celesta. A bold memorable heroic motif over tense minor-key harmony with soaring hopeful chord lifts. Larger and more imposing than ordinary monster combat, high sustained intensity and forward motion, epic scale without horror or frightening sounds. Clean premium modern orchestral game soundtrack, no chiptune, no vocals, no speech, no distorted guitars, controlled low end and smooth upper frequencies. Leave room for spoken vocabulary and combat effects, clear midrange on phone speakers. Begin with the full urgent battle arrangement immediately, no cinematic slow build, no silence, no breakdown, no victory ending or final cadence, no fade-out. Compose a repeatable 32-bar combat phrase lasting 51.2 seconds. The last bar must flow rhythmically and harmonically into the opening bar for continuous looping."),
]


def main():
    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        raise SystemExit("ELEVENLABS_API_KEY is required; do not pass credentials as arguments.")
    for family, name, duration, prompt in JOBS:
        folder = ROOT / "assets/audio/source" / family
        folder.mkdir(parents=True, exist_ok=True)
        target = folder / (name + ".mp3")
        if target.exists():
            print("Already generated: " + name, flush=True)
            continue
        body = {"prompt": prompt, "music_length_ms": duration,
                "force_instrumental": True, "model_id": "music_v2_5"}
        request = urllib.request.Request(
            "https://api.elevenlabs.io/v1/music?output_format=mp3_48000_192",
            data=json.dumps(body).encode(),
            headers={"xi-api-key": key, "Content-Type": "application/json"})
        print("Generating " + name + "...", flush=True)
        try:
            with urllib.request.urlopen(request, timeout=300) as response:
                data = response.read()
                content_type = response.headers.get("Content-Type", "")
            if "audio" not in content_type or len(data) < 10000:
                raise RuntimeError("Response was not usable audio")
        except urllib.error.HTTPError as error:
            try:
                detail = json.loads(error.read()).get("detail", {})
                status = detail.get("status", "request_rejected") if isinstance(detail, dict) else "request_rejected"
            except ValueError:
                status = "request_rejected"
            raise SystemExit("Generation stopped: HTTP " + str(error.code) + ", " + status)
        target.write_bytes(data)
        (folder / (name + ".json")).write_text(json.dumps({
            "provider": "ElevenLabs", "endpoint": "music", "request": body,
            "source": target.name, "output_format": "mp3_48000_192",
            "review": "Generated; processing and technical review pending. Listening review not performed."
        }, indent=2) + "\n", encoding="utf-8")
        print("Saved " + name + " (" + str(len(data)) + " bytes)", flush=True)


if __name__ == "__main__":
    main()
