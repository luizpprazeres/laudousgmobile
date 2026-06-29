# Plano de Paridade — App Android (React Native) ↔ App iOS (Swift)

> **Objetivo:** transformar o app **React Native Expo Android** (`apps/mobile`) para ficar **igual (ou muito semelhante)** ao app **Swift iOS** (`/Users/luizprazeres/laudousg-swift`) — design, fluxo de voz com Deepgram e todas as features — **exceto a lógica de geração de laudo**, que é comum aos dois (vive no backend).
>
> **Data:** 2026-06-22 · **Branch:** `web-v2` · **Status:** plano validado por Dex1 (fidelidade) + Dex2 (adversarial)
>
> **Reviews:** `docs/reviews/2026-06-22-dex1-fidelidade-paridade.md` · `docs/reviews/2026-06-22-dex2-adversarial-deepgram.md`

---

## ⛔ Regras inegociáveis

1. **NÃO TOCAR no app Swift** (`/Users/luizprazeres/laudousg-swift`). Está funcionando bem e é a **fonte de verdade** (referência de design e comportamento). Só leitura.
2. **NÃO mexer na lógica de geração de laudo** — é backend comum (`/api/generate` SSE), contrato já idêntico nos dois apps.
3. **App Android é o único alvo de mudança** (`apps/mobile`).
4. Cada item segue o processo DET: implementar → review Dex1 (fidelidade) + Dex2 (adversarial) → testar no APK/dev build → commit.

---

## 📊 Estado atual (o que o RN JÁ tem e funciona)

| Área | Status RN |
|------|-----------|
| Auth gate + Login/Signup (Supabase) | ✅ |
| Generate flow: gravar → transcrever → SSE → laudo | ✅ (voz é batch, ver Gap #1) |
| Clarify Q&A inline + resume | ✅ |
| Report detail (4 tabs: Laudo/Entendido/RAG/Meta) | ✅ |
| Histórico (lista 50, agrupado por data) | 🟡 sem busca/filtro/multi-delete |
| Analytics (KPIs + top categorias) | 🟡 sem heatmap/patologias |
| Preferências (nome, plano, tema, delete account) | 🟡 simplificado |
| Sobre/Legal (Termos/Privacidade/Disclaimer) | 🟡 estático, sem accept-gate, **texto desalinhado (diz "iOS"/"Whisper")** |
| Sala do auxiliar (pareamento) | ✅ básico |
| Design tokens (Inter+Barlow, cores brand) | ✅ |
| Dark mode | 🟡 parcial (login/generate/report em light fixo) |
| PlusSheet / Calculadoras | 🟡 **stub mínimo** (só `calc`+`clear`; só `ig`+`doppler`) |

Base sólida no core (~80% do fluxo de gerar laudo). O trabalho é **elevar voz + design + ferramentas clínicas + features secundárias** ao nível do Swift.

---

## 🔍 GAP ANALYSIS (validado pelos Dex, com file:line)

### 🎙️ GAP #1 — VOZ / DEEPGRAM (o maior, prioridade máxima)

| | Swift (referência) | RN (hoje) |
|---|---|---|
| Engine | **Deepgram Live** streaming | Whisper **batch** |
| Captura | `AVAudioEngine` tap → PCM linear16 16kHz mono | `expo-av` grava arquivo `.m4a` |
| Transporte | **WebSocket** `wss://api.deepgram.com/v1/listen` | upload multipart `POST /api/transcribe` |
| Transcrição | **ao vivo** (interim_results enquanto fala) | só depois de parar + esperar |
| Modelo | nova-3, pt-BR, smart_format, numerals, endpointing=300 | Whisper backend |
| Vocabulário | **keyterm prompting** (+ fallback sem keyterms) | — |
| Robustez | prewarm, auto-reconexão (4x), dedup, interrupções/route-change | — |
| Waveform | **real** (RMS/audioLevel por buffer) | **fake** (barras aleatórias) |
| Token | `POST /api/deepgram/token` (já existe no backend) | — |

- Swift: `Services/DeepgramLiveService.swift` (WS `:199`, PCM `:77`, tap `:360`, convert/send `:371`/`:402`, reconexão `:276`, token `:192`)
- RN hoje: `src/features/generate/transcribe.ts` (grava `:29`, para `:56`, upload `:73-84`); UI "Transcrevendo com Whisper" em `app/generate.tsx:150`
- **Token endpoint já existe** (`/api/deepgram/token`) — backend não precisa mudar.

### 🎨 GAP #2 — Design / Dark mode / Polish
- **Dark mode universal**: aplicar `useColorTokens()` em `login`, `generate`, `report` (telas novas já usam).
- **Polish**: igualar botões, cards, sombras (4 níveis), spacing (4–96), radius, micro-animações ao Swift DesignSystem.

### 🧩 GAP #3 — Telas/Features ausentes ou stub no RN

| Feature | Swift | RN | Fase |
|---|---|---|---|
| **Edição inline + autosave** do laudo final | ✅ | ❌ (imutável) | 1 |
| **Onboarding** (6 steps c/ first recording) | ✅ | ❌ | 1 |
| **Disclaimer accept-gate** (3 checkboxes, bloqueia uso) | ✅ | ❌ | 1 |
| **Feedback 👍/👎** (`/rest/v1/user_feedback`) | ✅ | ❌ | 1 |
| **Docs legais corrigidos** (tirar "iOS"/"Whisper", compliance Android) | — | ❌ | 1 |
| **History**: busca + filtro categoria + multi-delete | ✅ | ❌ | 1 |
| **Consultor IA** (chat + até 5 imagens, SSE `/api/consultant`) | ✅ | ❌ | 2 |
| **Minhas Frases** (CRUD) + **Plus sheet rico** | ✅ | 🟡 stub | 2 |
| **Calculadoras completas** (Hadlock, ILA, anemia MCA-PSV, AFC, ducto venoso, pré-eclâmpsia, BI-RADS, TI-RADS, volumes) | ✅ | 🟡 só ig/doppler | 2 |
| **Editor gráfico de Miomas** + esquemas mamário/tireoide | ✅ | ❌ | 2 |
| **Análise de imagem de USG** (`ImageAnalysisSheet`) | ✅ | ❌ | 2 |
| **Cartografia venosa MMII** | ✅ | ❌ | 2 |
| **Analytics**: heatmap diário + patologias frequentes | ✅ | ❌ | 2 |
| **Settings completo** (casas decimais, variantes por categoria, percentil obstétrico Intergrowth/Hadlock/WHO, estilo dinâmico) | ✅ | 🟡 | 2 |
| **Paywall sheet** (gating de Consultor etc.) | ✅ | ❌ | 2 |
| **Categorias / Writing Styles dinâmicos** (do backend) | ✅ | 🟡 hardcoded | 2 |

---

## 🗺️ Roadmap por fases

### 🔬 FASE 0 — Fundação técnica + SPIKE de voz (1 sprint) — GATE
**Não começar pela UI.** O item de voz é o de maior risco; precisa ser provado antes de qualquer port. (Recomendação do Dex2.)

1. **Migrar para Dev Client** (já configurado em `eas.json` → profile `development`). Expo Go fica fora.
2. **SPIKE Deepgram Live Android-only (1–2 dias)** — sequência obrigatória:
   1. Escolher captura PCM: **`@dr.pogodin/react-native-audio`** (candidato sério) ou `expo-audio useAudioStream` (se aceitarmos subir stack); `react-native-live-audio-stream` só como caminho rápido/arriscado.
   2. Gerar **dev build Android** (não Expo Go).
   3. Capturar 10s e salvar **raw com metadata real** (sample rate, canais, bits, endian).
   4. Enviar ao Deepgram com `encoding=linear16` + **sample_rate REAL** + `channels=1`. Validar transcript.
   5. Medir latência e perda em **≥3 aparelhos** (incluindo um intermediário).
   6. **Decisão de gate:** PCM estável? → segue para Fase 1 com Deepgram. Não estável? → **mantém Whisper batch no MVP** e Deepgram vira fase técnica separada.
3. **Token seguro**: portar `/api/deepgram/token` (nunca embutir chave Deepgram no bundle).
4. Unificar **design tokens** com o Swift (`src/ui/tokens.ts`).

### 🟠 FASE 1 — Paridade do core (2–3 sprints)
Prioridade conforme Dex1 (o que muda a "sensação de produto"):

5. **Deepgram Live completo** → substituir `transcribe.ts`: prewarm, interim/final, keyterms (+fallback), auto-reconexão clínica (preserva final, descarta parcial, sem duplicar), waveform real, RecordingOverlay igual ao Swift. **Manter Whisper como fallback.**
6. **Edição inline + autosave** do laudo final.
7. **Dark mode universal** + **polish de UI**.
8. **Disclaimer accept-gate** + **Onboarding** (6 steps).
9. **Feedback 👍/👎** + **docs legais corrigidos** (Android/compliance).
10. **History**: busca + filtro + multi-delete.

### 🟡 FASE 2 — Features ricas (2–3 sprints)
11. **Plus sheet rico** + **Consultor IA** (chat + imagens) + **Minhas Frases** (CRUD).
12. **Calculadoras completas** + **editor de Miomas** + esquemas mamário/tireoide + **análise de imagem** + **cartografia venosa**.
13. **Analytics** (heatmap + patologias), **Settings completo** (percentil obstétrico etc.), **Paywall**, **categorias/styles dinâmicos**.

---

## ⚠️ Riscos principais (refinados pelo Dex2)

| Risco | Sev | Mitigação |
|---|---|---|
| Stack atual (`expo-av`) não dá PCM ao vivo | 🔴 P0 | SPIKE Fase 0; trocar por `@dr.pogodin/react-native-audio` ou `expo-audio` |
| Formato errado ao Deepgram (sample rate/endian/base64) | 🔴 P0 | validar bytes raw com metadata real antes de enviar |
| 16kHz nem sempre nativo no Android (vem 48kHz) | 🟠 P1 | medir taxa real; usar `sample_rate` real ou resampler |
| Jitter/perda no bridge JS (PCM em alta frequência) | 🟠 P1 | buffer adequado; medir mic→interim→final em devices |
| Reconexão WebSocket "clínica" (não duplicar/perder) | 🟠 P1 | portar lógica do Swift `:276`, não port ingênuo |
| Background/lockscreen/Bluetooth/chamadas no Android | 🟠 P1 | foreground service + tratar interrupções/route-change |
| Dependência nativa quebra ciclo Expo Go → dev build/EAS | 🟠 P1 | assumido na Fase 0; CI ajustado |
| Variação por fabricante (Play Store) | 🟠 P1 | matriz mínima de devices reais |
| Escopo grande (15+ frentes) | 🟠 P1 | faseamento P0→P1→P2, cada um entregável |
| Manter batch Whisper como fallback | 🟢 P2 | não remover `transcribe.ts` até Deepgram estável |

---

## ✅ Próximos passos imediatos

1. **Decisão de stack de áudio**: aprovar começar pela **SPIKE** (Fase 0) com `@dr.pogodin/react-native-audio` em dev build Android.
2. **Migrar app para dev client** e gerar primeiro dev build Android.
3. Rodar os 6 passos da SPIKE → **gate de viabilidade** do Deepgram.
4. Em paralelo (não bloqueado por voz): **unificar design tokens** + **dark mode universal** (baixo risco, alto impacto visual).

> **Estratégia de produto:** se a pressa for publicar na Play Store, o MVP Android pode ir com **Whisper batch** (já funciona) e o **Deepgram Live entra logo depois** como upgrade — evita travar a publicação na frente de maior risco técnico.

---

## 📎 Referência de arquivos

**Swift (referência — só leitura):** `Services/DeepgramLiveService.swift`, `ReportService.swift`, `SSEStreamer.swift`, `FeedbackService.swift`; `DesignSystem/*`; `Features/{Auth,Generate,History,Settings,Consultor,Analytics,Onboarding,Legal,Miomas,Paywall}/`; `Components/Sheets/{PlusSheet,RecordingOverlay,ImageAnalysisSheet}.swift`

**RN (alvo):** `src/features/generate/{transcribe.ts,PlusSheet.tsx,CalculatorsSheet.tsx,state.ts}`; `src/lib/api.ts`; `src/ui/{tokens.ts,useColorTokens.ts,*.tsx}`; `src/legal/documents.ts`; `app/*.tsx`, `app/(auth)/*.tsx`; build: `eas.json`, `app.json`
