"""Normalize generated lobby originals and export browser loop formats using FFmpeg."""
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]


def main():
    folder = ROOT / "assets/audio/bgm/lobby"
    folder.mkdir(parents=True, exist_ok=True)
    for source in sorted((ROOT / "assets/audio/source/lobby").glob("*.mp3")):
        metadata = json.loads(source.with_suffix(".json").read_text(encoding="utf-8"))
        duration = metadata["requestedDurationMs"] / 1000
        base = f"highpass=f=25,atrim=duration={duration},asetpts=PTS-STARTPTS"
        measure = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(source), "-af",
                                  base + ",loudnorm=I=-16:TP=-1.5:LRA=9:print_format=json",
                                  "-f", "null", "-"], capture_output=True, text=True, check=True)
        stats, _ = json.JSONDecoder().raw_decode(measure.stderr[measure.stderr.rfind("{"):])
        normalize = ("loudnorm=I=-16:TP=-1.5:LRA=9:linear=true:"
                     f"measured_I={stats['input_i']}:measured_TP={stats['input_tp']}:"
                     f"measured_LRA={stats['input_lra']}:measured_thresh={stats['input_thresh']}:"
                     f"offset={stats['target_offset']}")
        filters = base + "," + normalize + f",afade=t=in:d=0.008,afade=t=out:st={duration - .008}:d=0.008"
        for extension, codec in [("ogg", ["-c:a", "libvorbis", "-q:a", "4"]),
                                 ("mp3", ["-c:a", "libmp3lame", "-b:a", "128k"])]:
            target = folder / (source.stem + "." + extension)
            subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(source),
                            "-af", filters, "-ar", "48000", "-ac", "2", *codec, str(target)], check=True)
            print(f"Exported {target.name}: {target.stat().st_size} bytes", flush=True)
        metadata["processing"] = {"tool": "FFmpeg", "filters": filters, "sourceLoudness": stats,
                                  "runtimeFormats": ["Vorbis quality 4", "MP3 128 kbps"],
                                  "sampleRate": 48000, "channels": 2}
        metadata["review"] = "Generated original; loudness normalized and 8 ms loop edge fades applied. Listening and musical seam approval pending. No lossless generation master supplied."
        (folder / (source.stem + ".json")).write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
