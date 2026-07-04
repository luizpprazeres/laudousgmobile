# Gap analysis Android — consolidado executável (Fase 0)

> **PROGRESSO 04/07 (sessão dedicada, branch feat/android-parity):**
> ✅ L0+L1 (c0338aa) · ✅ L2 (f61a9e0) · ✅ L3 validado no device (c9903e5) · ✅ L5 página web
> (d190dc8, falta deploy) · ✅ L7 AAB produção no EAS (final: build c6b56ebb, com tudo) ·
> ✅ B1 ThemeProvider (59a0ef4) · ✅ Edição inline+autosave c/ flush e update verificado
> (1f3378a+b0e0e60) · ✅ Feedback 👍/👎 (4896bf1) · ✅ Histórico busca/filtros/multi-delete/Sala
> (04a144b) · ✅ **Dark mode universal** (b0e0e60, 17 arquivos, validado dark+light no device).
> ⏳ Restam: onboarding 6 steps · forgot password · L8 Play Console (manual) · deploy web ·
> Fase 2 (calculadoras, consultor, etc.).

> Gerado 2026-07-04. Ancora e ATUALIZA o `docs/plano-paridade-android-swift.md` (22/06) com a
> auditoria de código de hoje + decisões D1/D2/D3 + pesquisa de docs oficiais (Play/Expo/Android).
> Detalhes por feature: `feature-parity-matrix.md` · navegação: `navigation-map.md` · design:
> `design-system-extraction.md`.

## O que MUDOU vs o plano de 22/06

1. **Deepgram Live SAIU do escopo** (D1) — Whisper batch fica no Android como A/B de produto.
   Toda a Fase 0 SPIKE de PCM do plano antigo está cancelada.
2. **Delete account JÁ EXISTE no RN** (`preferencias.tsx:262-331` + `/api/me/delete-account`) —
   o plano playstore dizia "ausente". Falta apenas o **link web de deleção** (exigência Google:
   opção in-app ✅ + URL web ❌) — criar página em web.laudousg.com e apontar no Play Console.
3. **Telas "em breve" já estão sem navegação** (biblioteca/seguranca registradas no Stack mas
   órfãs). Basta não linkar; opcional remover do Stack.
4. **A pasta `android/` existe** (prebuild feito) — builds locais via `npx expo run:android`
   funcionam (com JDK + node no PATH; ver §Ambiente).
5. **Target API 35 exigido pelo Play hoje** — Expo SDK 52 compila com API 35 ✅ (sem upgrade de
   SDK obrigatório para publicar).
6. **Ditado em foreground só precisa de RECORD_AUDIO** (confirmado na doc Android 14/15) — sem
   foreground service.

## Bugs/dívidas REAIS encontrados na auditoria (novos)

| # | Item | Evidência | Sev |
|---|---|---|---|
| B1 | Preferência de tema é cosmética — `laudousg.theme_mode` salvo mas nunca aplicado (sem ThemeProvider); StatusBar fixa dark | `preferencias.tsx:39-43,129-132`; `_layout.tsx:57` | P1 (D3) |
| B2 | Manifest com permissões extras vindas de libs: `READ/WRITE_EXTERNAL_STORAGE`, `SYSTEM_ALERT_WINDOW`, `MODIFY_AUDIO_SETTINGS`, `VIBRATE` | `android/app/src/main/AndroidManifest.xml` | P0 loja → usar `android.blockedPermissions` no app.json |
| B3 | Docs legais desalinhados: texto menciona "iOS"/"Whisper", markdown renderizado como texto cru, contato `contato@laudousg.com` | `sobre.tsx:63-68`; `src/legal/documents.ts` | P0 loja |
| B4 | UI diz "Transcrevendo com Whisper" mas Política de Privacidade lista Deepgram como operador | `generate.tsx:483` vs `documents.ts` | P1 (alinhar copy à verdade do backend) |
| B5 | Anon key Supabase commitada em `eas.json` (e `.env` no repo) | `eas.json` profiles | P2 (anon key é pública por design, mas mover p/ EAS env é higiene) |
| B6 | Signup sem coleta de aceite legal/CRM (Termos exigem CRM) | `(auth)/login.tsx` | P1 → resolvido pelo accept-gate |
| B7 | Histórico e `updateReportFinalOutput` acessam Supabase direto (dependem de RLS); resto via /api | `historico.tsx:55`; `api.ts:223-237` | P2 (consistência, não bloqueia) |
| B8 | `app.json` stub `{"expo":{}}` na RAIZ do monorepo (confunde tooling Expo) | `/app.json` | P2 → deletar |
| B9 | Comentário defasado em `CATS` ("9 listadas") — são 14; DB tem ~32 | `tokens.ts:126-128` | P3 |

## Caminho crítico de LOJA (Fase 1 — ordem revisada pós-review Dex1 04/07)

| # | Item | Esforço | Depende |
|---|---|---|---|
| L0 | **targetSdk 35** (hoje 34 — `build.gradle:8` default; Play exige 35 p/ apps novos) via `expo-build-properties` + **`allowBackup: false`** (app médico, manifest hoje `true`) | S | — |
| L1 | `blockedPermissions` (B2: storage×2 + SYSTEM_ALERT_WINDOW; manter MODIFY_AUDIO_SETTINGS/VIBRATE — normais, expo-av/haptics) + deletar app.json raiz (B8) | XS | — |
| L2 | Corrigir docs legais (B3/B4 **P0**): política deve listar **OpenAI/Whisper** como operador de ASR (backend confirmado `whisper-1`; Deepgram é só iOS live) + render markdown decente + contato | S | — |
| L3 | **Disclaimer accept-gate** (port do iOS: 3 checkboxes, versões "2.0", grava em `profiles` via supabase-js direto — colunas EXISTEM no DB; gate no root pós-auth, NÃO no login) | M | L2 |
| L5 | Link web de delete account (página em web.laudousg.com) + revisar fluxo in-app | S | fora do apps/mobile |
| L6 | Ícone/splash/branding release + versionCode/appVersionSource | XS | — |
| L7 | **AAB via EAS** (`eas build -p android --profile production`) + Internal testing | S | L0–L3, L6 |
| L8 | Play Console: listing "Produtividade" (D2), Data Safety (áudio→OpenAI, identifiers, UGC), **Health declaration HONESTA** (ferramenta profissional médica — não declarar "sem features de saúde"; risco de reclassificação é real, plano B CNPJ vivo), IARC, credenciais de teste | M | L7 |

> **Fora do caminho de loja** (Dex1): ThemeProvider/B1 é paridade de produto (P2 p/ loja) — segue
> em paralelo, não bloqueia AAB.
> **Já feito em 00b67d8 (22/06):** delete account in-app, docs legais copiados do Swift
> (`assets/legal/*.md` + `documents.ts`), disclaimer curto no laudo, telas "em breve" escondidas,
> permissões app.json só RECORD_AUDIO. **Backend follow-up pós-Android:** expor campos legais no
> `/api/me/profile` (drizzle+ProfileSchema+rota) — hoje o iOS decodifica `nil` e provavelmente
> re-mostra o gate a cada cold start.

## Paridade core (Fase 1.5 — muda a sensação de produto)

1. **Edição inline + autosave** (600ms generate / 1200ms report, salvar texto limpo, indicador Salvando/Salvo).
2. **Feedback 👍/👎** (`/rest/v1/user_feedback`; card pós-laudo, 👎 expande comentário).
3. **Dark mode universal** (migrar generate/report/sheets p/ `useColorTokens` — ver design-system-extraction §6).
4. **Onboarding 6 steps** (port fiel; usa Whisper batch — 100% portável).
5. **History: busca + filtros + multi-delete + push Sala por card.**
6. **Forgot password** (Supabase `/recover`).

## Fase 2 — features ricas (ordem sugerida)

Calculadoras (12 restantes — portar ESPEC dos `Services/*Calculator.swift`, não traduzir código) →
PlusSheet hub rico + Minhas Frases → Consultor IA + paywall (decidir billing: Play Billing ×
web checkout) → Análise de imagem → Analytics heatmap+patologias → Settings completo (estilos
dinâmicos, casas decimais, variantes, percentil obstétrico) → Esquemas (miomas, mama, tireoide,
cartografia venosa) → 28 categorias + styles dinâmicos → RecordingOverlay waveform real (metering
expo-av) → Tour.

## Ambiente de build (validado 04/07)

- Build local: `cd apps/mobile && npx expo run:android` com `JAVA_HOME="/Applications/Android
  Studio.app/Contents/jbr/Contents/Home"` (JDK 21) e node no PATH. Se o daemon Gradle foi criado
  sem node no env (Android Studio), rodar `android/gradlew --stop` antes.
- Node local v25 é não-suportado pelo Expo (imagem EAS SDK 52 = node 20.18.3). Se houver erro
  esquisito de Metro/build, testar com node 20 LTS antes de debugar.
- Produção: **EAS Build** (`eas build -p android`) gera AAB; keystore gerida pelo EAS;
  `appVersionSource: remote`.
- Device de teste: Samsung SM_G780G (`RQ8R9036KRX`).

## Riscos vivos

1. **Triagem Google × categoria Produtividade** (D2) — mitigação: copy de listing como ferramenta
   profissional de produtividade; Health declaration honesta ("no health features"); plano B = CNPJ.
2. Play exige **link web** de deleção de conta — depende de página fora deste repo.
3. Billing Android indefinido (Play Billing × web) — NÃO bloqueia lançamento (app funciona free);
   decidir antes de gate de Consultor IA.
4. SSE incremental: implementação usa `expo/fetch` + `getReader()` (correto por design) — validar
   token-a-token no device no sanity.
