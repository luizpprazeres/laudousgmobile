#!/usr/bin/env bash
#
# Sintetiza o áudio do corpus de benchmark de ASR, em três condições.
#
# ⚠️ RESSALVA METODOLÓGICA — leia antes de citar qualquer número que sair daqui:
# isto é TTS de UMA voz sintética com ruído sintético. Mede *fidelidade de termo
# em fala limpa e em ruído controlado*, e serve para comparar motores e configs
# entre si sob a mesma condição. NÃO substitui corpus de ditado real e NÃO é
# base para GO clínico. Falta: microfones diferentes, Bluetooth, máscara, ruído
# real de sala de exame, sotaques e a auxiliar falando por cima.
#
# ⚠️ Este script é uma RECONSTRUÇÃO da receita descrita em
# docs/brainstorm-transcricao-ao-vivo-2026-08-02.md §1.2. O áudio original da
# medição de 03/08 não foi versionado e está perdido, então os números gerados
# aqui NÃO serão idênticos aos daquele doc — apenas comparáveis entre si.
#
# Uso:  ./scripts/asr-bench/gen-audio.sh
# Env:  VOICE=Luciana  RATE_NORMAL=175  RATE_RAPIDO=260  SNR_DB=12
#
# Requer: macOS (`say`) + ffmpeg + python3.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="$DIR/audio"

VOICE="${VOICE:-Luciana}"
RATE_NORMAL="${RATE_NORMAL:-175}"
RATE_RAPIDO="${RATE_RAPIDO:-260}"
SNR_DB="${SNR_DB:-12}"

command -v say     >/dev/null || { echo "erro: 'say' não encontrado (precisa de macOS)"; exit 1; }
command -v ffmpeg  >/dev/null || { echo "erro: ffmpeg não encontrado (brew install ffmpeg)"; exit 1; }
say -v '?' | grep -q "^${VOICE}[[:space:]]" \
  || { echo "erro: voz '$VOICE' não instalada. Ajustes > Acessibilidade > Conteúdo Falado > Vozes."; \
       echo "vozes pt-BR disponíveis:"; say -v '?' | grep pt_BR || echo "  (nenhuma)"; exit 1; }

mkdir -p "$OUT"

# mean_volume em dB de um arquivo, via volumedetect.
mean_db() {
  ffmpeg -i "$1" -af volumedetect -f null - 2>&1 \
    | awk -F'mean_volume: ' '/mean_volume/{print $2+0; exit}'
}

# O formato bate com o que o app envia ao Deepgram: PCM 16 bits, 16 kHz, mono.
FMT="LEI16@16000"

python3 -c '
import json, sys
for c in json.load(open(sys.argv[1])):
    print(c["id"] + "\t" + c["texto"].replace("\n", " "))
' "$DIR/corpus.json" | while IFS=$'\t' read -r id texto; do
  echo "→ $id"

  say -v "$VOICE" -r "$RATE_NORMAL" --data-format="$FMT" -o "$OUT/${id}__normal.wav" "$texto"
  say -v "$VOICE" -r "$RATE_RAPIDO" --data-format="$FMT" -o "$OUT/${id}__rapido.wav" "$texto"

  # Condição "ruído": a MESMA fala da condição normal, somada a ruído rosa
  # calibrado para SNR_DB. Usar a fala normal como base é proposital — isola a
  # variável ruído, sem misturar com a variável velocidade.
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT/${id}__normal.wav")
  ffmpeg -y -v error -f lavfi -t "$dur" -i "anoisesrc=c=pink:r=16000:a=0.3" \
    -ac 1 -ar 16000 -c:a pcm_s16le "$OUT/.noise_${id}.wav"

  speech_db=$(mean_db "$OUT/${id}__normal.wav")
  noise_db=$(mean_db "$OUT/.noise_${id}.wav")
  gain=$(python3 -c "print(f'{$speech_db - $SNR_DB - ($noise_db):.2f}')")

  ffmpeg -y -v error -i "$OUT/${id}__normal.wav" -i "$OUT/.noise_${id}.wav" \
    -filter_complex "[1:a]volume=${gain}dB[n];[0:a][n]amix=inputs=2:duration=first:normalize=0[o]" \
    -map "[o]" -ac 1 -ar 16000 -c:a pcm_s16le "$OUT/${id}__ruido.wav"
  rm -f "$OUT/.noise_${id}.wav"

  mix_max=$(ffmpeg -i "$OUT/${id}__ruido.wav" -af volumedetect -f null - 2>&1 \
    | awk -F'max_volume: ' '/max_volume/{print $2+0; exit}')
  # amix com normalize=0 soma de verdade, então clipping é possível: avisa.
  awk -v m="$mix_max" 'BEGIN{ if (m > -0.5) print "  ⚠️  clipping no mix (max="m" dB) — baixe SNR_DB ou a amplitude do ruído" }'
done

echo
echo "pronto: $(ls -1 "$OUT"/*.wav | wc -l | tr -d ' ') arquivos em $OUT"
echo "(SNR alvo ${SNR_DB} dB · voz ${VOICE} · ${RATE_NORMAL}/${RATE_RAPIDO} wpm)"
