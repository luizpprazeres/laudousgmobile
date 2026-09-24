# Evolução clínica e interface Web — 24/09/2026

Pedido: imagens IMG_8018–8026 e 8028–8038, conteúdo original fundamentado, blocos reutilizáveis, mamas compactas, BI-RADS sugerido, esquemas integrados, recomendações e composição de exames.

## Ciclo de execução

Pesquisar → modelar seleção/estado/texto → implementar → testar casos positivos, negativos, incompletos e reset → revisão independente → corrigir até GO. GO de UI não equivale a GO clínico ou publicação. A rodada inicial não autorizava alterações remotas; Luiz autorizou posteriormente commit e push em branch, conforme fechamento abaixo. Banco remoto e publicação em produção não fazem parte desta entrega.

## Frentes e critérios de aceite

- [x] Inventário visual das 20 imagens, separando observação de inferência e sem copiar frases.
- [x] Fontes clínicas primárias acessadas e matriz de alegações/limites, com lacunas explícitas.
- [x] Mamas: campos proporcionais, nódulos compactos, mesmos valores preservados; interação em desktop/mobile sem sobreposição.
- [x] Esquemas anatômicos em cartões da grade, estado compartilhado com formulário, sem encobrir laudo.
- [x] Seleções compactas e rins bilaterais sem perder lateralidade, campos ou reset isolado.
- [x] Bexiga/rins: reutilização entre categorias, compatibilidade de estados anteriores, particularidades de via e saída canônica testadas.
- [x] Sugestão BI-RADS sincronizada aos achados, fonte clínica única, incompletude e categoria manual preservadas; testes de contraposição.
- [x] Recomendações, elastografia/gordura e MSK: implementar o que tiver contrato e evidência suficientes; registrar precisamente o restante e material necessário.
- [x] Associação rápida de exames: bilateralidade MSK implementada no contrato existente; combinações de categorias independentes exploradas em documento de arquitetura, sem simular uma composição ainda não suportada.
- [x] Validação final: typecheck, testes por contrato clínico, browser real, build, revisão do diff e prévia atualizada no Chrome.

## Ownership inicial

Opus: MamariaFormPanel e teste específico. Sol: diagnóstico arquitetural, depois backend/contratos atribuídos. Sonnet: extração visual. Luna: pesquisa clínica. Orquestrador: integração, esquemas, controles comuns, testes e revisão.

## Limites

Alterações anteriores de cartões preservadas. Harness local usa mocks e não prova saída clínica de produção. Falha preexistente dopplerWebMode.manual.ts:97 deve ser separada de regressões novas. Sem deploy ou mudança de banco; commit/push seguem a autorização registrada na rodada final.

## Resultado da revisão central — primeira rodada

A 5ª edição local do BI-RADS é a base autorizada por Luiz; informações oficiais públicas atuais são complemento, não acesso ao manual integral v2025. O painel sugere apenas situações cobertas e mantém a classificação aplicada pelo médico separada. Nenhuma categoria 4A–5 é inferida por soma de descritores.

Recomendações exigem inclusão explícita. Elastografia e gordura hepática são blocos descritivos com método/unidade, validação integral de números e confirmação para entrar no laudo. Não há conversão automática para estágio de fibrose/esteatose. Mudar método ou unidade apaga a medida anterior para evitar reinterpretá-la.

MSK: o browser integrado confirmou seleção bilateral, independência dos lados, reset isolado e restauração ao reabrir o lado. A migração de estado anterior é executada antes da troca de lado/segmento. O teste do renderer passou 25 grupos, incluindo a correção de morfologia perdida quando o padrão não tinha slug canônico.

Testes novos de fígado (21), BI-RADS (46) e adapter mamário (12) foram adicionados ao runner web. Todos passaram; o runner para na falha preexistente de Doppler em `dopplerWebMode.manual.ts:97`. Não declarar a suíte inteira verde. A revisão mamária documenta ainda dez falhas anteriores de `alteracoes.manual.ts`, reproduzidas no HEAD isolado.

## Fechamento técnico — primeira rodada

GO para revisão local da interface e dos fluxos estruturados cobertos. Typecheck e build de web/API passaram após a integração final. Lint sem erros (avisos anteriores fora desta frente permanecem). `git diff --check` limpo. Browser integrado passou em 1440, 1024, 768, 390 e 320 px, claro/escuro; mamas e BI-RADS passaram também em harness com renderer real (1440/390). Teste renal anterior: 13/13; urinário novo: 19 grupos; MSK novo: 25 grupos. Os relatórios de validação específicos detalham os demais regressivos.

Não é GO clínico irrestrito nem liberação de produção. Persistência/Sala reais não foram validadas nesta prévia. O teste histórico de abdome que depende de PostgreSQL local ficou indisponível; o contrato novo foi testado com renderer real e máscara sintética. O catálogo geral ainda tem falhas anteriores documentadas. A revisão médica das novas redações e dos contextos de aplicação permanece necessária antes de publicar.

Prévia reconstruída em http://127.0.0.1:4173/ e aberta no Google Chrome real, com Abdome Total visível. Esta é uma prévia de interface com resposta de laudo demonstrativa; os testes do renderer real são separados. Processo supervisionado por `launchctl`, job `com.laudousg.web-clinical-preview`, log `/tmp/laudousg-phase2/preview.log`; HTTP 200 e listener confirmados. Sem commit, push, deploy ou alteração remota.

Materiais que permitirão aprofundar a etapa seguinte: identificação/capa e capítulos de bexiga/próstata e elastografia/quantificação do volume CBR informado pelo Luiz; protocolo e tecnologia do equipamento para quantificação hepática. Nenhuma classificação numérica universal foi incorporada sem essas definições.

## Rodada autorizada de revisão e publicação

Luiz autorizou revisar/melhorar e, ao terminar, commitar e pushar. O destino é a branch `feat/web-clinical-workspace-review`, sem merge na main. Nesta rodada: corrigir falhas comprovadas, alinhar testes obsoletos sem enfraquecer contraposições, repetir lint/typecheck/test/build afetados e revisar inclusão de arquivos. Arquivos de saída locais, cache Supabase, PDFs e capturas originais não entram no commit.

- [x] Teste de Doppler distingue avaliação placentária indevida da menção legítima à inserção placentária na técnica. As 15 suítes web passaram.
- [x] Calculadora de volume rejeita prefixos numéricos seguidos de texto e identifica os campos/unidades.
- [x] Escopo somente axilas esconde sugestão BI-RADS e esquema de mama; retornar ao escopo mamário restaura os painéis.
- [x] Catálogo `axilas_atipicas` declara escopo: o achado não desaparece mais na prévia do catálogo. Gate geral agora 300/300.
- [x] Prévia ganhou modo com renderer canônico local; Abdome usa estilo Objetivo, independente da máscara do banco. Smoke UI→adapter→renderer passou em abdome e vias urinárias. Autenticação, salvamento e Sala seguem simulados.
- [x] Revisão final de estados urinários e testes da integração: 25 grupos, incluindo estados mistos e reset.
- [x] Gates finais e conferência de arquivos para commit: lint/typecheck/build web e API, 15 suítes web, 300 verificações do catálogo, browser 320–1440 e smoke com renderer real passaram.

Estado da story: Ready for Review. Publicação autorizada em branch; o hash e a confirmação do remoto serão informados na entrega, sem considerar isso validação clínica ou deploy.

O lint da API estava sem configuração e abria um prompt interativo. Foi configurado com as regras Next já utilizadas no workspace e o plugin TypeScript já disponível. O único erro de navegação encontrado foi corrigido no retorno da tela de Sala inválida, usando Link do Next. Não foram desativadas regras para obter aprovação; avisos preexistentes permanecem.

A prévia em 4173 foi reconstruída com `WORKSPACE_REAL_RENDER=1`: agora os cliques de achados usam o renderer canônico. O teste de interface convencional mantém seu stub para verificar layout; o modo real é validado separadamente. O título da aba identifica a prévia como local e sem salvamento.

Reproduzir a prévia (raiz do repositório):

```sh
WORKSPACE_TABS_PREVIEW=1 WORKSPACE_REAL_RENDER=1 PORT=4173 pnpm exec tsx --tsconfig apps/api/tsconfig.json apps/web/tests/workspaceTabs.browser.manual.ts
```

Smoke de texto real: omitir `WORKSPACE_TABS_PREVIEW` e `PORT`, manter `WORKSPACE_REAL_RENDER=1` e informar `PLAYWRIGHT_MODULE` se Playwright estiver fora do workspace.

## File list da entrega

- `README.md`
- `apps/api/.eslintrc.json`
- `apps/api/src/app/sala/[token]/page.tsx`
- `apps/api/src/server/renderer/__tests__/alteracoes.manual.ts`
- `apps/api/src/server/renderer/catalog/__tests__/msk-descritores-lados.manual.ts`
- `apps/api/src/server/renderer/catalog/__tests__/shared-urinary-organs-ponta-a-ponta.manual.ts`
- `apps/api/src/server/renderer/catalog/alteracoes/MAMARIA.ts`
- `apps/api/src/server/renderer/categories/MAMARIA.ts`
- `apps/api/src/server/renderer/categories/PELVE_FEMININA.ts`
- `apps/api/src/server/renderer/categories/PROSTATA_SUPRAPUBICA.ts`
- `apps/api/src/server/renderer/categories/VIAS_URINARIAS.ts`
- `apps/api/src/server/renderer/categories/sharedUrinary.ts`
- `apps/api/src/server/renderer/findingsSchemas/ABDOMEN_TOTAL.ts`
- `apps/api/src/server/renderer/phrases/ABDOMEN_TOTAL.ts`
- `apps/web/src/components/laudar/BiometryGrowthPanel.tsx`
- `apps/web/src/components/laudar/LaudarWebExperience.tsx`
- `apps/web/src/components/laudar/LiverQuantificationPanel.tsx`
- `apps/web/src/components/laudar/MamariaBiradsPanel.tsx`
- `apps/web/src/components/laudar/MamariaFormPanel.tsx`
- `apps/web/src/components/laudar/OrganFormPanel.tsx`
- `apps/web/src/components/laudar/RecommendationsPanel.tsx`
- `apps/web/src/components/laudar/TireoideFormPanel.tsx`
- `apps/web/src/components/laudar/TrisomyFmfPanel.tsx`
- `apps/web/src/components/laudar/WorkspaceSectionGrid.tsx`
- `apps/web/src/components/laudar/reportRichText.ts`
- `apps/web/src/components/visualSchemas/VisualSchemaPanel.tsx`
- `apps/web/src/lib/calculators/mamariaBiradsSugestao.ts`
- `apps/web/src/lib/catalog/abdomeParaCatalogo.ts`
- `apps/web/src/lib/catalog/mamariaParaCatalogo.ts`
- `apps/web/src/lib/catalog/musculoesqueleticoParaCatalogo.ts`
- `apps/web/src/lib/catalog/pelveParaCatalogo.ts`
- `apps/web/src/lib/catalog/prostataParaCatalogo.ts`
- `apps/web/src/lib/catalog/viasUrinariasParaCatalogo.ts`
- `apps/web/src/lib/deterministic/liverQuantification.ts`
- `apps/web/src/lib/deterministic/organs/bexigaAbdome.ts`
- `apps/web/src/lib/deterministic/organs/musculoesqueletico.ts`
- `apps/web/src/lib/deterministic/organs/pelveFeminina.ts`
- `apps/web/src/lib/deterministic/organs/prostataSuprapubica.ts`
- `apps/web/src/lib/deterministic/organs/rim.ts`
- `apps/web/src/lib/deterministic/organs/urinaryShared.ts`
- `apps/web/src/lib/deterministic/organs/vesicula.ts`
- `apps/web/src/lib/deterministic/organs/viasUrinarias.ts`
- `apps/web/src/lib/deterministic/types.ts`
- `apps/web/tests/dopplerWebMode.manual.ts`
- `apps/web/tests/liverQuantification.manual.ts`
- `apps/web/tests/mamariaAdapter.manual.ts`
- `apps/web/tests/mamariaBirads.browser.manual.ts`
- `apps/web/tests/mamariaBirads.browser.tsx`
- `apps/web/tests/mamariaBirads.manual.ts`
- `apps/web/tests/mamariaForm.browser.manual.ts`
- `apps/web/tests/mamariaForm.browser.tsx`
- `apps/web/tests/run-unit.cjs`
- `apps/web/tests/trisomyFormSync.browser.manual.ts`
- `apps/web/tests/workspaceTabs.browser.manual.ts`
- `docs/mamaria-boletim-avaliacao.html`
- `docs/mamaria-objetivo-boletim.html`
- `docs/reviews/2026-09-24-alteracoes-manual-evidence.md`
- `docs/reviews/2026-09-24-clinical-ui-architecture.md`
- `docs/reviews/2026-09-24-exam-composition.md`
- `docs/reviews/2026-09-24-mamaria-validation-logs/base-alteracoes.txt`
- `docs/reviews/2026-09-24-mamaria-validation-logs/base-mamaria-boletim.txt`
- `docs/reviews/2026-09-24-mamaria-validation-logs/base-mamaria-ponta-a-ponta.txt`
- `docs/reviews/2026-09-24-mamaria-validation-logs/depois-alteracoes.txt`
- `docs/reviews/2026-09-24-mamaria-validation-logs/depois-mamaria-boletim.txt`
- `docs/reviews/2026-09-24-mamaria-validation-logs/depois-mamaria-ponta-a-ponta.txt`
- `docs/reviews/2026-09-24-mamaria-validation-logs/head-alteracoes-falhas.txt`
- `docs/reviews/2026-09-24-mamaria-validation-logs/head-alteracoes.txt`
- `docs/reviews/2026-09-24-mamaria-validation-logs/head-mamariaAdapter.txt`
- `docs/reviews/2026-09-24-mamaria-validation.md`
- `docs/reviews/2026-09-24-msk-validation.md`
- `docs/reviews/2026-09-24-screenshot-inventory.md`
- `docs/reviews/2026-09-24-ultrasound-sources.md`
- `docs/reviews/2026-09-24-urinary-validation.md`
- `docs/stories/2026-09-24-clinical-ui-evolution.md`
- `docs/stories/2026-09-24-web-cards-por-orgao.md`
