# Plano de melhorias Android — proposta para aprovação (06/07/2026)

> Status: **AGUARDANDO APROVAÇÃO DO LUIZ** (aprovar por item: A1, B4…).
> Contexto: v8 (vc=5) implantado no teste interno; fix do eco do Whisper já em prod.

## Bloco A — Qualidade do ditado (continuação do que fizemos)

| # | Item | Esforço | Impacto |
|---|------|---------|---------|
| A1 | **Pilotar `TRANSCRIBE_MODEL=gpt-4o-mini-transcribe`** (só setar env na Vercel; A/B com ditados reais; rollback = apagar env) | 5 min + observação | Transcrição mais rápida e mais precisa; menos alucinação (modelo novo da OpenAI) |
| A2 | **Pausar/retomar gravação** + ouvir o áudio antes de enviar (estilo WhatsApp) | 1 dia | Médico interrompido pelo paciente não perde o ditado |
| A3 | AudioSource `VOICE_RECOGNITION` (patch de 1 linha no expo-av) | ½ dia | Mic afinado para fala → acurácia; validar A/B |

## Bloco B — Fluxo do médico

| # | Item | Esforço | Impacto |
|---|------|---------|---------|
| B4 | **Compartilhar imagem do WhatsApp → LaudoUSG** (share target; expo-share-intent) | 2–3 dias | Maior ROI de produto: médico recebe USG pelo WhatsApp o dia todo |
| B5 | Notificação "Laudo pronto" + App Links verificados | 1 dia | Retenção; link de laudo abre no app |
| B6 | Minhas Frases (biblioteca de frases próprias) | 2 dias | Backlog antigo; paridade iOS |

## Bloco C — Plataforma / dívida técnica

| # | Item | Esforço | Impacto |
|---|------|---------|---------|
| C7 | **Edge-to-edge** (Android 15 já enforça; receita pronta no doc de diferenciais) | 1–2 dias | Evita botões sob a barra de gestos em devices novos — P0 técnico |
| C8 | R8/proguard + upload de mapping | ½ dia | Some o aviso amarelo do Play; app menor |
| C9 | Quick Settings Tile "Ditar laudo" (módulo nativo próprio) | 2 dias | Diferencial Android puro (estilo Google Recorder) |

## Bloco D — Lançamento (dependem do Luiz)

| # | Item | Quem |
|---|------|------|
| D10 | **Teste fechado: 12 testadores × 14 dias** — GARGALO para produção | Luiz recruta; eu preparo o material de convite |
| D11 | Ficha da loja final (screenshots dark mode? vídeo?) | juntos |
| D12 | Consultor IA no Android | aguarda decisão de billing (Play 15% × web) |

## Recomendação de ordem (se aprovar tudo)

**Sprint 1 (próxima sessão):** A1 (imediato) → B4 (carro-chefe) → C7 (dívida) → C8 (rápido).
**Sprint 2:** A2 → B5 → A3.
**Sprint 3:** B6 → C9 → D12 (se billing decidido).
**Paralelo desde já:** D10 (recrutamento dos 12 testadores — sem isso não há produção).
