# Plano — LaudoUSG Android / Play Store

> **Status:** 🟢 EM EXECUÇÃO (2026-07-04, sessão dedicada). Base: análise de gap RN×Swift (Dex2) + políticas atuais do
> Google Play para apps de saúde. iOS 1.0 (145) em WAITING_FOR_REVIEW na Apple.
>
> **⚠️ ESTE PLANO FOI SUPERSEDIDO em 04/07 por `docs/parity/android-gap-analysis.md`** (caminho
> L0–L8 revisado pelo Dex1, com pesquisa de docs oficiais atualizada). Correções ao texto abaixo:
> - **Delete account JÁ EXISTIA** (commit 00b67d8 de 22/06) — falta só o **link web** de deleção.
> - **Docs legais + disclaimer curto + telas "em breve" + permissões app.json**: feitos em 00b67d8.
> - **A pasta `android/` EXISTE** (prebuild feito) — build local via `npx expo run:android` funciona.
> - **targetSdk 35** exigido (era 34 por default do SDK 52) — corrigido em c0338aa (04/07).
> - Sanity 04/07 no device (SM_G780G): login→achados→**SSE token-a-token OK** (risco SSE eliminado).
> - Decisões D1/D2 (Whisper fica no Android; categoria Produtividade) em `docs/parity/decisions-pending.md`.
> - Health declaration deve ser **honesta** (não "sem features de saúde") — review Dex1 04/07.

## Contexto
- **App Android = Expo RN 0.76.9** (`apps/mobile`). É o ÚNICO candidato (o Swift é iOS-only).
- O RN **já é funcional** (não é mock): login, ditado→`/api/transcribe`, geração `/api/generate` SSE,
  histórico, detalhe/copiar/compartilhar, analytics, Sala. Mesmo backend do iOS (`laudousgmobile.vercel.app`).
- **Nunca teve IAP** (sem libs de billing) — nada a remover.
- **Conta Google Play = Individual.**

## ⚠️ Bloqueio de política (resolver ANTES)
O Google **não permite conta Individual** em apps **Medical/Health** (aplica amplamente, prazo 28/jan/2026
já passou). Opções:
- **(A) Categoria "Produtividade"** (não Medical): posicionar como *ferramenta de redação de laudos para
  médicos* (não app de saúde do consumidor; não usa Health Connect; opera sobre achados desidentificados).
  \+ disclaimer obrigatório. **Risco:** o Google pode reclassificar como Medical pela natureza do conteúdo.
- **(B) Migrar a conta para Organization (CNPJ):** resolve definitivamente (Google e Apple). Requer
  entidade jurídica + verificação (dias). *Decisão pendente: você tem CNPJ disponível?*
- Recomendação: se tiver CNPJ → (B) é o caminho certo para um app médico. Sem CNPJ agora → (A) como MVP,
  ciente do risco.

## Fase 1 — RN MVP (P0: bloqueadores de loja) — *portar do Swift / ajustar*
1. **Excluir conta** (Google exige para apps com login). Portar do Swift `DeleteAccountView` →
   `/api/me/delete-account` (`AuthService.deleteAccount`). **Ausente no RN.**
2. **Documentos legais no app** (Termos, Privacidade, Disclaimer Médico) — tela "Sobre/Legal" com
   markdown local/links. RN só tem texto no login. **Ausente.**
3. **Disclaimer médico** explícito (aceite no 1º login ou rodapé persistente "revise antes de assinar").
   **Ausente no RN.**
4. **Remover telas "em breve"** visíveis: Biblioteca (`biblioteca.tsx`), Segurança (`seguranca.tsx`),
   "Anexar imagem" (`PlusSheet.tsx`), "Anemia fetal" (`CalculatorsSheet.tsx`). (esconder do menu)
5. **Permissões Android** (`app.json`): remover `READ_EXTERNAL_STORAGE` (galeria está "em breve");
   revisar `MODIFY_AUDIO_SETTINGS`. Manter só `RECORD_AUDIO`.
6. **Build + teste real Android:** gerar AAB via **EAS Build** (`eas.json` já existe) — sem pasta
   `android/`. **Validar em device real:** login → microfone → `/api/transcribe` → `/api/generate` SSE
   incremental (`res.body.getReader()` em `src/lib/api.ts:268` — ponto sensível no runtime Android) →
   copiar/compartilhar → histórico → Sala.

## Fase 2 — Play Console (preenchimento)
- **Store listing:** título (LaudoUSG), descrição curta + completa (com disclaimer médico), ícone,
  feature graphic, screenshots (gerar do app Android). Reusar copy adaptada do iOS.
- **Categoria:** Produtividade (ver bloqueio acima).
- **Content rating (IARC):** questionário (app profissional, sem conteúdo sensível → classificação livre).
- **Data Safety:** declarar Email, User ID, **Áudio** (transcrição), **Conteúdo do usuário** (achados/laudos);
  uso = funcionalidade do app; vinculado à conta; sem tracking publicitário. Alinhar com a privacy policy.
- **App access:** login obrigatório → fornecer **credenciais de teste** (`apple-review@laudousg.com` /
  `apple12345` ou criar conta de teste própria) + roteiro, como no iOS.
- **Target audience:** adultos (profissionais de saúde). **Ads:** não. **Government/financial:** não.
- **Health declaration form:** preencher se a categoria/triagem do Google acionar (provável em app médico).

## Fase 3 — Release
- **Internal testing** primeiro (validar AAB num grupo) → **Closed/Production**.

## P1 — Paridade (depois do MVP)
feedback 👍/👎 (`user_feedback`), Consultor IA + gating, UI rica de stages no progresso, editor pós-laudo,
categorias do backend (RN tem 14 hardcoded; DB tem ~32), "Minhas frases"/variantes, apagar laudos no histórico.

## P2 — Nice-to-have
onboarding/tour, análise de imagem/câmera, calculadoras avançadas, deep links/intent filters.

## Riscos-chave
1. **Conta Individual × app médico** (maior risco externo). 
2. **SSE incremental no Android/Expo** (pode não streamar token a token; testar cedo).
3. **Reclassificação de categoria** pelo Google.
