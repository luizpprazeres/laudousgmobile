# asr-bench — harness de benchmark de ASR

Mede **se o termo médico saiu certo**, não WER global. Para laudo, um erro não vale o mesmo
que outro: lateralidade e medida são erro clínico; palavra comum não é.

Promovido de `scratchpad/` em 06/08. Foi o harness que gerou os números do
`docs/brainstorm-transcricao-ao-vivo-2026-08-02.md` §1.2.

## Rodar

```bash
./scripts/asr-bench/gen-audio.sh                                              # 1. sintetiza o áudio (macOS)
pnpm tsx scripts/asr-bench/dump-keyterms.ts scripts/asr-bench/keyterms.json   # 2. serializa o glossário
python3 scripts/asr-bench/bench.py                                            # 3. roda contra o Deepgram
```

A chave sai de `DEEPGRAM_API_KEY` no ambiente ou do `.env` da raiz.

Para medir o ganho do **corretor determinístico separado** do ganho dos keyterms:

```bash
pnpm tsx scripts/asr-bench/apply-corrector.ts \
  scripts/asr-bench/bench_results.json scripts/asr-bench/bench_corrected.json
```

## Arquivos

| Arquivo | O quê |
|---|---|
| `corpus.json` | 6 ditados sintéticos (tireoide, abdome, venoso, obstétrico, MSK, mama) com os termos a checar |
| `gen-audio.sh` | Sintetiza 18 WAVs = 6 casos × 3 condições (normal · rápido · ruído a 12 dB SNR) |
| `dump-keyterms.ts` | Serializa o glossário de produção para o Python — mesma fonte de verdade, sem cópia manual |
| `bench.py` | Roda cada áudio em cada config de keyterms e conta acerto de termo |
| `apply-corrector.ts` | Aplica `correctMedicalTerms` sobre os transcripts crus |

Gerados e **não versionados**: `audio/`, `keyterms.json`, `bench_results.json`, `custom.json`.

Para testar uma lista de keyterms sua sem tocar no glossário, crie
`custom.json` no formato `{"nome da config": {"CATEGORIA": ["termo", ...]}}` — o `bench.py`
adiciona cada entrada como uma coluna a mais.

## ⚠️ O que este harness NÃO prova

**É TTS de uma voz sintética com ruído sintético.** Serve para comparar motores e
configurações **entre si**, sob a mesma condição. Não serve para GO clínico e não substitui
corpus de ditado real.

Faltam: microfones diferentes, Bluetooth/AirPods, máscara, ruído real de sala com aparelho
ligado, fala acelerada de verdade, sotaques, e a auxiliar falando por cima.

E o mais fácil de esquecer: **este harness mede o ganho, não o dano.** Ele conta termos que
saíram certos; não conta termos já corretos que o corretor determinístico estragou. Medir as
duas coisas exige comparar contra o transcript cru, termo a termo — ainda não implementado.

## Achado de 06/08 — o teto de keyterms do Deepgram

Rodando o harness, a config com o glossário completo devolveu **0/159**. Não era diluição:
eram 18 HTTP 400 com a mensagem

```
Keyterm limit exceeded. The maximum number of tokens across all keyterms is 500.
```

O limite é em **tokens de subpalavra**. Medido contra a API com este vocabulário:
**137 palavras passam, 138 dão 400.**

**Por que isso é silencioso e perigoso:** o cliente iOS, ao ver a conexão com keyterms
falhar, reconecta **sem** eles. Nenhum erro aparece — o ditado só despenca de ~85% para
~66% de acerto de termo.

Protegido por `KEYTERM_WORD_BUDGET` em `apps/api/src/server/asr/medicalGlossary.ts`, com
teste em `__tests__/medicalGlossary.manual.ts`. **A folga hoje é de 1 palavra.**
