#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 4 || $# -gt 5 ]]; then
  echo "Usage: $0 INPUT_DIR OUTPUT_STRIP FRAME_WIDTH FRAME_HEIGHT [SOURCE_FRAME_GAP_PX]" >&2
  exit 2
fi

input_dir=$1
output_strip=$2
frame_width=$3
frame_height=$4
source_frame_gap_px=${5:-50}

command -v ffmpeg >/dev/null || { echo "ffmpeg is required" >&2; exit 1; }
command -v ffprobe >/dev/null || { echo "ffprobe is required" >&2; exit 1; }
[[ -d "$input_dir" ]] || { echo "Input directory not found: $input_dir" >&2; exit 1; }
[[ "$frame_width" =~ ^[1-9][0-9]*$ ]] || { echo "FRAME_WIDTH must be a positive integer" >&2; exit 2; }
[[ "$frame_height" =~ ^[1-9][0-9]*$ ]] || { echo "FRAME_HEIGHT must be a positive integer" >&2; exit 2; }
[[ "$source_frame_gap_px" =~ ^[0-9]+$ ]] && (( source_frame_gap_px == 50 )) || { echo "SOURCE_FRAME_GAP_PX must be exactly 50" >&2; exit 2; }

mapfile -t frames < <(find "$input_dir" -maxdepth 1 -type f -name '*.png' -printf '%f\n' | sort -V)
(( ${#frames[@]} > 0 )) || { echo "No PNG frames found in $input_dir" >&2; exit 1; }

work_dir=$(mktemp -d)
trap 'rm -rf -- "$work_dir"' EXIT

runtime_inputs=()
spaced_inputs=()
gap_image="$work_dir/gap.png"
ffmpeg -loglevel error -y -f lavfi \
  -i "color=c=black@0.0:s=${source_frame_gap_px}x${frame_height},format=rgba" \
  -frames:v 1 "$gap_image"

for index in "${!frames[@]}"; do
  src="$input_dir/${frames[$index]}"
  dimensions=$(ffprobe -v error -select_streams v:0 \
    -show_entries stream=width,height -of csv=s=x:p=0 "$src")
  [[ "$dimensions" == "${frame_width}x${frame_height}" ]] || {
    echo "Frame ${frames[$index]} is $dimensions; expected ${frame_width}x${frame_height}. Normalize all frames with one shared scale and anchor before assembly." >&2
    exit 1
  }

  runtime_inputs+=( -i "$src" )
  if (( index > 0 )); then
    spaced_inputs+=( -i "$gap_image" )
  fi
  spaced_inputs+=( -i "$src" )
done

mkdir -p "$(dirname "$output_strip")"
ffmpeg -loglevel error -y "${runtime_inputs[@]}" \
  -filter_complex "hstack=inputs=${#frames[@]},format=rgba" "$output_strip"

extension=${output_strip##*.}
stem=${output_strip%.*}
spaced_output="${stem}_spaced_master.${extension}"
ffmpeg -loglevel error -y "${spaced_inputs[@]}" \
  -filter_complex "hstack=inputs=$((${#spaced_inputs[@]} / 2)),format=rgba" "$spaced_output"

echo "Runtime strip: $output_strip"
echo "Spaced master: $spaced_output"
echo "Source frame gap: ${source_frame_gap_px}px"
echo "Frames: ${#frames[@]}"
