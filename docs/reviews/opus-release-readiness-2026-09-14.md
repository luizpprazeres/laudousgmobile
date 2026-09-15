# Prontidão de publicação — LaudoUSG iOS (auditoria read-only)

Data: 14/09/2026 · Autor: Claude (Opus 5), sessão única, sem agentes.
Escopo: `/Users/luizprazeres/laudousg-swift/LaudoUSG` e docs de `/Users/luizprazeres/laudousgmobile-def`.
Tudo abaixo vem de **documentos e código-fonte locais**. Nada foi conferido
no App Store Connect, TestFlight, Vercel ou Supabase. Status "Aguardando revisão"
é o que as notas registraram em 13/09, **não é o estado atual**.
"Little Lighthouse Store" aparece só como processo alheio preservado em
`docs/stories/2026-09-14-ios-doppler-mode-images.md:66`. Não tem relação com o LaudoUSG.

## 1. Versão/build mais recente documentada

- `LaudoUSG.xcodeproj/project.pbxproj:324,348,372,396`: `MARKETING_VERSION = 1.0`,
  `CURRENT_PROJECT_VERSION = 190`, bundle `com.laudousg.LaudoUSG`.
- `docs/appstore/release-190.md:1-5,178-204`: envio completo com 6 itens (app 1.0 (190),
  4 assinaturas e o grupo "LaudoUSG Planos"), ID `2ba0be0d-64fb-40fd-8964-0190b9ce149c`,
  lançamento manual. Não há aprovação nem publicação registradas.
- Envio parcial anterior `508fbe0b-…` foi cancelado (`release-190.md:163-170`). Não confundir os dois.
- Diferença 189→190: só o manifesto de privacidade e o número do build (`release-190.md:11-17`).
- O reflog local (`.git/logs/HEAD`) termina em "chore(ios): preparar build 185".
  Não achei commit de 189/190 no reflog. Como não rodei `git status`, não confirmo se o
  fonte do archive 190 foi commitado. Tratar como **não rastreado até prova em contrário**.

## 2. Gates executados vs. faltantes (conforme as notas)

| Gate | Estado documentado | Fonte |
|---|---|---|
| XCTest completo | 76 passed / 0 failed / 3 skipped (WHO). Rodou no **189**, não no 190 | `release-190.md:28`; `docs/stories/2026-09-13-doppler-appstore.md:141` (repo def) |
| XCTest dirigido pós-190 (Doppler/imagem) | 19/19 em iPhone físico, host isolado. Código **posterior ao 190** | `docs/stories/2026-09-14-ios-doppler-mode-images.md:68-80` |
| Archive/upload 190 + associação à versão | Feito | `release-190.md:19-27` |
| Privacidade da loja (10 tipos) + política 2.1 publicada | Feito | `release-190.md:139-144`; story def `:145-149` |
| URLs de notificação Apple (produção/sandbox) salvas | Feito | story def `:151-153` |
| IAP backend: 105 asserções sintéticas, JWS forjado recusado | Feito (sintético) | story def `:100-106` |
| Compra sandbox, restauração e renovação reais | **Faltando** | story def `:27`; `release-190.md:202` |
| Notificação App Store Server V2 real ponta a ponta | **Faltando** | story def `:30` |
| Catálogo StoreKit carregando no aparelho | **Falhou antes do reparo de preços**. Retry não confirmado | `release-190.md:107-114,172-175` |
| Teste via TestFlight (instalar/comprar/restaurar) | **Não confirmado** | `release-190.md:180-187` |
| Lint API / `pnpm test` | Bloqueado (sem config ESLint) / zero tarefas: **não conta** | story def `:74-75`; `docs/stories/2026-09-14-modelos-e-calculadoras.md:133-135` |
| Aprovação Apple e liberação manual | **Externo, pendente** | story def `:34` |

## 3. Risco de incluir calculadoras locais não validadas

1. **Build 190 já enviado**: qualquer mudança local só entra com build novo, e o build
   novo reinicia a revisão. A frente de 14/09 (modo Doppler, filtro de imagem) é código
   dirty posterior ao 190 (`ios-doppler-mode-images.md:34,48`). Não deve entrar em 1.0
   sem uma decisão explícita.
2. **Validação FMF ainda não existe**: PE está em paridade com goldens internos e
   8 comparações manuais. Trissomias estão `validation-pending`. Oftálmicas e PIG/RCF
   não têm fonte/versão definidas. Não há comparação externa nova (`docs/fmf-verificacao-2026-09-14.md:33-45,207-210`).
   O port iOS está em `LaudoUSG/Services/PreEclampsiaCalculator.swift:109`
   (`FMF/AJOG-2020+cal-2026-08-22`) e já declara "Não constitui software certificado pela FMF" (`:615`).
3. **Calculadoras já expostas no iOS com achados abertos** (`docs/auditoria-calculadoras-2026-06-24.md`):
   - `Services/HadlockCalculator.swift:146-147`: `normalizeCm` ainda usa `value > 20 ? /10`
     (achado #6). CA de 35 cm vira 3,5.
   - `Services/PercentileTable+WHOMulticentre.swift:4,7-9`: tabelas vazias
     (`PENDING-CURATION`), mas a opção aparece em `Features/Settings/PreferencesSection.swift:42,61`.
     Se o médico escolher WHO, o percentil sai nulo (`HadlockCalculator.swift:178-185`).
   - Achados clínicos #5, #7, #11 (gaussiana em extremos, DV sem Hecher, cutoff IP fixo)
     não têm aval documentado. O #4 (anemia) parece corrigido para ≥1,50 (`AnemiaMCAPSVCalculator.swift:69-70`).
   - Rotas de 13 calculadoras em `Components/Sheets/PlusSheet.swift:67-141`. Anemia aparece
     como "Em breve" em `CalculatorsSheet.swift:39-43`. Não confirmei o filtro por categoria no PlusSheet.
   - Não há testes para Anemia, DV, AFC, ILA, BI-RADS e volumes em `LaudoUSGTests/`.
4. **Backend compartilhado**: a árvore do repo def estava dirty no início desta sessão
   (inclui `apps/api/src/app/api/iap/*`, `generate/route.ts` e `D apps/api/src/server/iap/jws.ts`).
   A API validada saiu do worktree isolado `/tmp/laudousg-release-186` (story def `:90-95`).
   Deploy a partir da árvore principal durante a revisão pode quebrar o IAP ou a geração do build revisado.

## 4. Pendências IAP e metadados documentadas

- Compra/restauração sandbox reais, TestFlight e notificação V2 real (seção 2).
- Senha da conta Sandbox Brasil perdida (`release-190.md:183`).
- Catálogo vazio no simulador e no aparelho antes do reparo das tabelas de 175 regiões.
  A causa não foi provada. Pode levar até 1 h de propagação (`release-190.md:172-176`).
- Disponibilidade: Pro Mensal só no Brasil. Essencial Mensal em 1/175 locais. Não houve
  conferência equivalente dos anuais (`release-190.md:154-161`).
- **`docs/appstore/app-review-notes.md` está desatualizado e sensível**:
  - traz a senha da conta demo em texto puro (`:22,93`);
  - diz que o aceite legal vem pré-aceito na versão 1.2, mas as notas reais registram 2.0/2.1/2.0 aceitos pela UI;
  - cita `gpt-4.1-mini`, "câmera não usada" e o caminho "Configurações", sem IAP nem consentimento de IA.
  - O texto salvo na loja foi corrigido à parte (`release-190.md:189`), então o arquivo local não reflete a loja.
- Conta demo com 117 laudos não deve ser apagada. Whitelist beta não confirmada (story def `:84-85`).
- Pós-aprovação: trocar a senha demo (`app-review-notes.md:148-156`).

## 5. Plano curto (sem executar nada)

1. Congelar o 1.0 (190) e **não** subir build novo nem mexer na API de produção a partir da árvore dirty enquanto a revisão estiver aberta.
2. Luiz confere ao vivo no App Store Connect o status do envio `2ba0be0d…`. As notas não valem como estado.
3. Antes de "Lançar manualmente": compra + restauração no TestFlight (conta Apple BR) e um evento V2 real registrado em `subscriptions`.
4. Commitar/etiquetar o fonte exato do 190 (hoje sem evidência no reflog).
5. Próximo build (1.0.1/1.1): corrigir `normalizeCm` e esconder WHO até a curadoria. Incluir a frente Doppler de 14/09 com XCTest completo.
   Novas calculadoras FMF (trissomias, PIG/RCF, oftálmicas) só depois de comparação externa e aval clínico.
6. Reescrever `app-review-notes.md` sem a senha e alinhado ao texto salvo na loja.

## 6. Limites desta auditoria

- Sem Bash: não rodei `git status`/`git log` no repo Swift, build, testes nem `xcresulttool`. Os números de testes são citações.
- Não abri portais, credenciais nem assinatura. Não alterei código, signing ou dados.
- Não li todos os docs (ex.: `release-189.md`, `SUBMISSAO-146.md`, `plano-iap-*`, `privacy-nutrition-labels.md`) nem todo o código das calculadoras.
- Único arquivo gravado: este.
