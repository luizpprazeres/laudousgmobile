# Paridade Android dos modelos hepáticos — 02/10/2026

Status: preparado e **desligado** (`HEPATIC_ANDROID_MODELS_ENABLED = false`). Branch `claude/android-hepatic-parity`. Sem push, deploy, alteração de Web, API, `packages/shared`, banco, landing, Sala ou flags de produção.

## Escopo

Paridade do app Android (RN/Expo) com o fluxo hepático da Web para `AVALIACAO_MULTIPARAMETRICA_HEPATICA` e `ELASTOGRAFIA_HEPATICA`, consumindo o contrato `hepatic-assessment/v1` de `@laudousg/shared` como está ([contrato](2026-10-02-hepatic-contract.md)).

| Peça | Arquivo | Espelha |
| --- | --- | --- |
| Catálogo, gate, rascunho inicial, configuração | `apps/mobile/src/features/generate/hepaticModels.ts` | `apps/web/src/lib/hepaticModels.ts` |
| Operações do workspace | `apps/mobile/src/features/generate/hepaticWorkspace.ts` | `apps/web/src/lib/hepaticAssessmentWorkspace.ts` |
| Persistência, revisão e máquina de estados | `apps/mobile/src/features/generate/hepaticReportFlow.ts` | `apps/web/src/lib/hepaticReportFlow.ts` |
| Tela | `apps/mobile/src/features/generate/HepaticReportWorkspace.tsx` | `HepaticAssessmentWorkspace.tsx` + `HepaticReportWorkspace.tsx` |
| Seletor (oculto) | `apps/mobile/src/ui/tokens.ts` (`HEPATIC_PENDING_CATS`) | `categoryGroups.ts` |
| Roteamento | `apps/mobile/app/generate.tsx` | `LaudarWebExperience.tsx` |
| Sessão | `apps/mobile/src/lib/api.ts` (`getAuthenticatedUserId`) | `supabase.auth.getUser` |

## Comportamento

- **Gate:** com o gate desligado, as categorias não entram em `CATS` e `isEnabledHepaticAndroidModel` devolve falso, então `generate.tsx` nunca roteia para o fluxo hepático. Ativar é release conjunta (categorias ativas no banco e critérios de qualidade aprovados no servidor), não flag remota.
- **Rascunho:** nenhum método, unidade, normalidade, aquisição ou interpretação presumidos. O `examId` é um UUID v4, que vira o id do laudo (chave de idempotência na API). Sem Web Crypto no Hermes, o fallback usa `Math.random`; o id não é segredo e a API recusa colisão de outro dono ou conteúdo.
- **Edição:** passa pelas operações imutáveis do contrato. Revisão, indicação, medidas, método, unidade e jejum apagam confirmações e derivações dependentes. Trocar unidade descarta as medidas, sem conversão. Digitação parcial fica fora do payload.
- **Qualidade:** o registro de critérios é vazio no cliente, como na Web e no servidor (`APPROVED_HEPATIC_QUALITY_CRITERIA = []`). O botão fica desabilitado e a conclusão permanece bloqueada. Nenhum limiar foi criado.
- **Interpretação:** sempre texto do médico. As confirmações usam o id do usuário autenticado, porque a API recusa outro ator. A avaliação multiparamétrica exige correlação aplicada e conclusão integrada confirmada.
- **API:** `POST /api/v1/hepatic-reports` cria ou atualiza (`report_id` + `expected_revision`). A resposta só é aceita se estiver pendente, na categoria da finalidade, com o id do exame e **exatamente** os dados enviados (comparação canônica); qualquer divergência é erro. `POST /api/v1/hepatic-reports/:id/review` envia a revisão e o texto exatos, e só `ok: true` libera.
- **Liberação:** "Copiar laudo" fica disponível apenas depois da revisão confirmada pelo servidor. Qualquer edição volta a "editando". O texto copiado é o renderizado e salvo pelo servidor. O fluxo **não** chama `publishCleanReportToSala`/`pushReportToSala`; a Sala lê o mesmo `reports` e só mostra "revisado" quando a revisão corresponde ao conteúdo atual.

## Validação (sintética)

```sh
pnpm --filter @laudousg/mobile typecheck
pnpm exec tsx --tsconfig apps/mobile/tsconfig.json apps/mobile/src/features/generate/hepaticModels.manual.ts      # 4/4
pnpm exec tsx --tsconfig apps/mobile/tsconfig.json apps/mobile/src/features/generate/hepaticWorkspace.manual.ts   # 9/9
pnpm exec tsx --tsconfig apps/mobile/tsconfig.json apps/mobile/src/features/generate/hepaticReportFlow.manual.ts  # 7/7
```

Regressões existentes também passaram: `clinicalModels` 3/3, `clinicalModelFlow` 8/8 e `categories` 1/1 (o seletor liberado não mudou). Fiz ainda um export Metro Android focal com variáveis sintéticas (`expo export --platform android`), que gerou o bytecode Hermes contendo contrato, categorias e endpoint.

Os critérios de qualidade, mínimos e referências dos testes são **sintéticos** e só exercitam o gate; não são recomendação clínica. A rede é simulada nos testes.

## Limites

- Não houve teste em aparelho/emulador, APK, chamada real à API, banco ou Sala. A tela foi verificada por typecheck e bundle, não visualmente.
- A ativação depende de categorias ativas (`0031_inactive_hepatic_categories.sql`), de `HEPATIC_REPORTS_V1_ENABLED` e de critérios de qualidade aprovados no servidor. Enquanto isso, a API responde `hepatic_reports_v1_unavailable` ou `hepatic_quality_criterion_unapproved`, e o app mostra a mensagem correspondente.
- Não há reabertura de rascunho hepático pelo histórico nem retomada após fechar a tela. O rascunho vive na sessão da tela, como na Web.
- iOS continua sem paridade (fase própria). Complementos de abdome (`abdomen_total`/`abdomen_superior`) não foram expostos.
- CodeRabbit NÃO EXECUTADO.
