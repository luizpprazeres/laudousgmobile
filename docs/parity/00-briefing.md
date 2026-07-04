# Briefing — App Android (paridade + publicação) — para a sessão dedicada

> **Escrito 2026-07-04** por Claude (Fable) a pedido do Luiz, para **orientar a próxima
> sessão dedicada** (terminal novo, contexto limpo, Dex1+Dex2). Consolida o estado real do
> app Android + análise crítica do prompt externo + a decisão estratégica. **Ler este
> arquivo PRIMEIRO** antes de auditar/codar.

---

## 1. Estado REAL (desfaz a confusão do README antigo)

- **O app Android EXISTE e está ATIVO.** É `apps/mobile/` — React Native / Expo 52, **RN
  0.76.9**. Não precisa criar do zero; ~80% do fluxo core já funciona (login Supabase,
  ditado→`/api/transcribe`, geração `/api/generate` SSE, histórico, detalhe/copiar/
  compartilhar, analytics, Sala do auxiliar). Mesmo backend do iOS (`laudousgmobile.vercel.app`).
- **Android Studio / emular:** o projeto nativo Gradle está em **`apps/mobile/android/`**
  (o prebuild do Expo já foi feito — por isso a pasta existe, diferente do que o
  `plano-android-playstore.md` de 22/06 dizia). Fluxo recomendado:
  `cd apps/mobile && npx expo run:android` (compila o `android/` e instala no device/emulador).
  Abrir `apps/mobile/android/` no Android Studio também funciona para builds Gradle nativos.
- **O README antigo estava DESATUALIZADO** (dizia `apps/mobile` congelado). **Corrigido em
  04/07.** A confusão veio de uma fase real em que o Android foi congelado em favor do iOS —
  depois foi RETOMADO. Commits recentes provam a retomada (`feat(mobile): adiciona Doppler
  arterial/renal/venoso ao picker RN`, `feat(mobile): Cervical no picker`).
- **Fonte de verdade de produto = app iOS Swift** (`~/laudousg-swift`, só leitura). NÃO tocar.

## 2. JÁ EXISTEM dois planos validados (REUSAR, não recriar)

1. **`docs/plano-paridade-android-swift.md`** (22/06, validado Dex1+Dex2): gap analysis RN×Swift
   com file:line, roadmap em fases, riscos. **O maior gap = VOZ** (RN usa Whisper *batch*; iOS
   usa **Deepgram Live** streaming). É P0 de produto E o item de MAIOR RISCO técnico (PCM ao
   vivo no Android é incerto) → o plano o trata como **SPIKE/GATE na Fase 0** (provar antes de
   portar). Demais gaps: dark mode universal, edição inline, onboarding, disclaimer gate,
   feedback 👍/👎, history busca/filtro, calculadoras completas, consultor IA, análise de imagem.
2. **`docs/plano-android-playstore.md`** (22/06): o **caminho crítico de PUBLICAÇÃO** (menor que
   a paridade total): delete-account, docs legais no app, disclaimer médico, esconder telas "em
   breve", permissões Android (só `RECORD_AUDIO`), build AAB via EAS, Data Safety, e o
   **bloqueador externo**: o Google **não permite conta Individual** em apps Medical/Health.

## 3. Análise crítica do prompt externo (o que aproveitar / corrigir)

**Manter (o prompt acerta):** não traduzir Swift→RN literal (extrair especificação); auditar
antes de codar; mudanças incrementais preservando o que funciona; Dex1 como revisor;
decisions-pending para dúvidas; prioridade engenharia (produto>paridade>estabilidade>
arquitetura>performance>publicação>refino). A estrutura `docs/parity/` é boa.

**Corrigir (pontos cegos do prompt — ele não conhece o contexto):**
- **Não "criar do zero".** Já há plano de paridade + playstore validados pelos Dex → a
  auditoria deve ANCORAR neles (o `android-gap-analysis.md` já está 80% pronto no plano-paridade).
- **Voz é GATE, não "mais um bloco".** O prompt lista design system como bloco 2 e trata tudo
  igual. A voz (Deepgram Live) é o de maior risco → decidir CEDO: SPIKE de PCM ao vivo OU
  aceitar **Whisper batch no MVP** (já funciona) e Deepgram como upgrade pós-lançamento.
- **O prompt IGNORA o bloqueador de publicação** (conta Google Individual × app médico). Isso
  pode travar o lançamento por completo, independente da qualidade do app → resolver em §5.
- **O prompt confunde "paridade total" com "lançar rápido".** São dois objetivos diferentes
  (§4). O objetivo imediato do Luiz é LANÇAR — o caminho é um MVP enxuto, não a paridade completa.
- **Comandos:** é projeto **Expo** → usar `npx expo run:android` (não `npx react-native
  run-android`); `./gradlew assembleRelease` funciona mas o idiomático é EAS Build (`eas build
  -p android`). `adb devices` e `npx expo-doctor` valem.
- **Dex:** a casa usa **Dex1** (código, GPT-5.5) **+ Dex2** (2ª opinião clínica/adversarial),
  via `medmaestri ask "dex1"`/`"dex2"`. Usar ambos.

## 4. A DECISÃO ESTRATÉGICA (o norte da sessão) — precisa do Luiz

Há dois objetivos em tensão:

| | **(A) Lançar rápido (MVP)** | **(B) Paridade rica com iOS** |
|---|---|---|
| Escopo | delete-account, legal, disclaimer, esconder "em breve", permissões, AAB, resolver conta Google | Deepgram Live, dark mode universal, calculadoras completas, consultor IA, editor de miomas, análise de imagem… |
| Voz | **Whisper batch** (já funciona) | Deepgram Live streaming (SPIKE de risco) |
| Prazo | ~1 sprint | meses (fases) |
| Fonte | `plano-android-playstore.md` | `plano-paridade-android-swift.md` |

**Recomendação (Fable):** **A → depois B.** Publicar o MVP com Whisper batch destrava a loja
sem esperar o item de maior risco (voz); a paridade rica entra como upgrades pós-lançamento.
O prompt externo otimiza B — mas o objetivo imediato declarado ("prestes a lançar") é A. A
sessão deve começar por A, com B mapeado logo atrás.

## 5. Ordem de trabalho recomendada para a sessão dedicada

**Fase 0 — auditoria (sem tocar produção), gerar os docs/parity/ restantes:**
- `navigation-map.md`, `feature-parity-matrix.md`, `android-gap-analysis.md` (ancorar no
  plano-paridade), `design-system-extraction.md` (iOS DesignSystem × `src/ui/tokens.ts`).
- Rodar `npx expo run:android` num device/emulador e **confirmar que o core funciona** hoje
  (login→ditado→SSE→laudo→histórico). Sanity antes de mudar qualquer coisa.
- Review Dex1 da auditoria.

**Fase 1 — MVP de publicação (caminho crítico, objetivo A):** seguir `plano-android-playstore.md`
Fase 1 (delete-account, legal, disclaimer, esconder "em breve", permissões) + validar AAB via EAS
+ **resolver a conta Google** (§ decisions-pending). Cada item: implementar → Dex1/Dex2 → testar
no device → commit.

**Fase 2+ — paridade rica (objetivo B):** dark mode universal + polish (baixo risco, alto impacto
visual) em paralelo; depois a SPIKE de voz Deepgram (gate); depois features ricas por bloco.

## 6. Riscos-chave a não esquecer
1. **Conta Google Individual × app médico** (bloqueador externo — pode travar o lançamento).
2. **Deepgram Live PCM ao vivo no Android** (incerto — por isso é SPIKE/gate; MVP pode ir com Whisper).
3. **SSE incremental no Android/Expo** (`res.body.getReader()` em `src/lib/api.ts` — testar cedo
   que streama token-a-token no runtime Android).
4. **Não reescrever o que funciona** (~80% do core está pronto).

> **Entregáveis desta conversa (feitos):** README corrigido; `docs/parity/00-briefing.md` (este);
> `docs/parity/decisions-pending.md`. **A auditoria completa + código = próxima sessão dedicada.**
