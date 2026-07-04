# Decisões pendentes — App Android (aguardam o Luiz)

> Registradas 2026-07-04. A próxima sessão dedicada deve resolver estas ANTES de avançar
> nos blocos correspondentes. Cada uma tem a opção mais segura pré-selecionada.

## D1 — Estratégia de lançamento: MVP-primeiro ou paridade-total? 🔴 (norte da sessão)
- **Contexto:** o core Android já funciona (~80%). Lançar exige um MVP enxuto
  (`plano-android-playstore.md`); a paridade rica com o iOS é meses de trabalho.
- **Opção A (recomendada):** publicar o MVP com **Whisper batch** (já funciona) e fazer a
  paridade rica (Deepgram Live, calculadoras, consultor) como upgrades pós-lançamento.
- **Opção B:** segurar o lançamento até a paridade rica (inclui a SPIKE de voz, maior risco).
- **Pendente:** Luiz confirma A ou B?

## D2 — Conta Google Play: Individual × Organization (CNPJ)? 🔴 (bloqueador externo)
- **Contexto:** o Google **não permite conta Individual** em apps Medical/Health.
- **Opção A (definitiva):** migrar a conta para **Organization (CNPJ)** — resolve Google e
  Apple para um app médico. Requer entidade jurídica + verificação (dias).
- **Opção B (MVP arriscado):** publicar como categoria **"Produtividade"** (ferramenta de
  redação de laudos, não app de saúde do consumidor) + disclaimer. Risco: reclassificação
  pelo Google.
- **Pendente:** Luiz tem CNPJ disponível? Se sim → A. (Já perguntado em 22/06, segue aberto.)

## D3 — Stack de captura de áudio para o Deepgram Live (quando for B) 🟠
- **Contexto:** `expo-av` grava arquivo (batch); Deepgram Live precisa de **PCM linear16 ao
  vivo**. Incerto no Android (pode vir 48kHz, jitter no bridge JS).
- **Opção candidata:** `@dr.pogodin/react-native-audio` (ou `expo-audio useAudioStream`) em
  **dev build** (Expo Go não serve). Requer a **SPIKE de gate** da Fase 0 do plano-paridade.
- **Pendente:** aprovar a SPIKE quando chegarmos em B (não bloqueia o MVP).

## D4 — Escopo visual do MVP: quanto polir antes de lançar? 🟡
- **Contexto:** dark mode é parcial (login/generate/report em light fixo). Polish de UI é alto
  impacto visual, baixo risco.
- **Opção (recomendada):** MVP publica funcional mesmo com dark mode parcial; dark mode
  universal + polish entram como primeira leva pós-MVP (ou em paralelo, não bloqueante).
- **Pendente:** Luiz aceita lançar com dark mode parcial?

## D5 — Deepgram no Android vale o esforço, ou Whisper batch basta? 🟡
- **Contexto:** a voz ao vivo (Deepgram) é o diferencial de UX do iOS, mas é o maior risco no
  Android. Whisper batch já entrega laudo correto (só sem transcrição ao vivo).
- **Pendente:** Luiz considera a transcrição ao vivo essencial no Android v1, ou aceita batch
  e prioriza outras features?
