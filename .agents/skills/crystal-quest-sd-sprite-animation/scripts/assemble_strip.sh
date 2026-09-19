#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 4 || $# -gt 5 ]]; then
  echo "Usage: $0 INPUT_DIR OUTPUT_STRIP FRAME_WIDTH FRAME_HEIGHT [SPACING_MULTIPLIER]" >&2
  exit 2
fi

input_dir=$1
output_strip=$2
frame_width=$3
frame_height=$4
spacing_multiplier=${5:-3}

command -v ffmpeg >/dev/null || { echo "ffmpeg is required" >&2; exit 1; }
command -v ffprobe >/dev/null || { echo "ffprobe is required" >&2; exit 1; }
[[ -d "$input_dir" ]] || { echo "Input directory not found: $input_dir" >&2; exit 1; }
[[ "$frame_width" =~ ^[1-9][0-9]*$ ]] || { echo "FRAME_WIDTH must be a positive integer" >&2; exit 2; }
[[ "$frame_height" =~ ^[1-9][0-9]*$ ]] || { echo "FRAME_HEIGHT must be a positive integer" >&2; exit 2; }
[[ "$spacing_multiplier" =~ ^[0-9]+$ ]] && (( spacing_multiplier >= 3 )) || { echo "SPACING_MULTIPLIER must be an integer >= 3" >&2; exit 2; }

mapfile -t frames < <(find "$input_dir" -maxdepth 1 -type f -name '*.png' -printf '%f\n' | sort -V)
(( ${#frames[@]} > 0 )) || { echo "No PNG frames found in $input_dir" >&2; exit 1; }

work_dir=$(mktemp -d)
trap 'rm -rf -- "$work_dir"' EXIT

runtime_inputs=()
spaced_inputs=()
spaced_width=$((frame_width * spacing_multiplier))

for index in "${!frames[@]}"; do
  src="$input_dir/${frames[$index]}"
  spaced="$work_dir/spaced-$(printf '%04d' "$index").png"

  dimensions=$(ffprobe -v error -select_streams v:0 \
    -show_entries stream=width,height -of csv=s=x:p=0 "$src")
  [[ "$dimensions" == "${frame_width}x${frame_height}" ]] || {
    echo "Frame ${frames[$index]} is $dimensions; expected ${frame_width}x${frame_height}. Normalize all frames with one shared scale and anchor before assembly." >&2
    exit 1
  }

  ffmpeg -loglevel error -y -i "$src" \
    -vf "pad=${spaced_width}:${frame_height}:(ow-iw)/2:0:color=0x00000000,format=rgba" \
    -frames:v 1 "$spaced"

  runtime_inputs+=( -i "$src" )
  spaced_inputs+=( -i "$spaced" )
done

mkdir -p "$(dirname "$output_strip")"
ffmpeg -loglevel error -y "${runtime_inputs[@]}" \
  -filter_complex "hstack=inputs=${#frames[@]},format=rgba" "$output_strip"

extension=${output_strip##*.}
stem=${output_strip%.*}
spaced_output="${stem}_spaced_master.${extension}"
ffmpeg -loglevel error -y "${spaced_inputs[@]}" \
  -filter_complex "hstack=inputs=${#frames[@]},format=rgba" "$spaced_output"

echo "Runtime strip: $output_strip"
echo "Spaced master: $spaced_output"
echo "Frames: ${#frames[@]}"
