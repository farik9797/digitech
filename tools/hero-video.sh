#!/bin/bash
# Готовит фоновое видео для hero из ролика Flow (Veo, 8 с, 16:9):
# зацикливание вперёд-назад (без скачка на стыке), 1280 px, 24 к/с, без звука, H.264 с faststart.
# Запуск: bash tools/hero-video.sh <вход.mp4> <выход.mp4>
set -euo pipefail
in="$1"; out="$2"
ffmpeg -y -v error -i "$in" \
  -filter_complex "[0:v]scale=1280:-2:flags=lanczos,fps=24,split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0,format=yuv420p[v]" \
  -map "[v]" -an -c:v libx264 -preset slow -crf 28 -profile:v high -movflags +faststart "$out"
ls -lh "$out" | awk '{print $5, $9}'
