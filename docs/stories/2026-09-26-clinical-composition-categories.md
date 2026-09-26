# Story — composição de exames associados na Web (v1)

**Data:** 26/09/2026
**Prioridade:** Web
**Status:** Ready for Review — implementação Web, contrato/API e conteúdo urinário concluídos localmente. QA final do Prumo: GO para o escopo API/Web, com exceções globais do LAB (`docs/reviews/2026-09-26-final-release-qa.md`). Publicação na main autorizada por Luiz; execução com DevOps após o fechamento do root. Sem banco remoto alterado.

## Escopo real desta rodada

O que foi decidido na rodada:

- **Uma versão nova de contrato, só para COMPOSIÇÃO:** `clinical-composition/v1`. As categorias avulsas **não** ganharam versão nova, e não há migração nem breaking change de exame antigo.
- **Dois pares, autorizados pelo usuário:**
  - Abdome total + Próstata (suprapúbica).
  - Mamas e axilas + Pelve feminina.
  - Nenhuma "categoria gigante": cada componente continua sendo a categoria canônica, com o mesmo adaptador e o mesmo renderer.
- **Web v1 primeiro:** endpoint compartilhado novo `POST /api/compositions/render` no `apps/api`. `/api/catalog/[category]/render` e `/generate` não mudaram.
- **Urinário/próstata:** o conteúdo clínico novo foi definido pela Clínica. São campos opcionais: `lesao_focal` vesical com forma/calcificação, `vesiculas_seminais` e `bexiga_lesao_focal`, e um payload sem eles renderiza igual ao anterior.
- **Obstetrícia e MSK:** só regressão, sem reescrita.
- **Grupos de categoria (picker, outro Opus):** Tireoide fica em **Pequenas partes**, não em Saúde da mulher.

Fora do escopo:

- **Sala:** não recebe `web_reports` nem laudos mobile. É transporte diferente do histórico; não houve improviso de migração para `reports`.
- **iOS/Android:** não leem `web_reports`. Não se afirma leitura mobile da composição sem prova. A composição é Web v1.
- **Exportação e reabertura de laudo avulso:** o laudo avulso continua só texto no histórico.

## Ownership

| Frente | Owner | Limite |
|---|---|---|
| Integração Web: UI, hook, proxy, persistência, histórico/reabertura | Atlas (Opus integração) | `LaudarWebExperience.tsx`, `AssociationPanel.tsx`, `lib/composition/*`, rotas Web `compositions/render` e `web-reports/[id]`, `webReports.ts`, histórico, testes de composição Web |
| Contrato compartilhado e endpoint/renderer de composição | Sol (Codex) | `packages/shared/src/schemas/clinicalComposition.ts`, `apps/api/src/app/api/compositions/render`, `apps/api/src/server/renderer/composition/*` |
| Conteúdo clínico urinário/próstata | Clínica (Opus revisão) | `urinaryShared.ts` (Web), `sharedUrinary.ts`, `PROSTATA_SUPRAPUBICA.ts`, `VIAS_URINARIAS.ts` (API) |
| Category picker | Opus picker | `ExamCategoryPicker.tsx`, `categoryGroups.ts` |
| Pesquisa e QA cross-platform | Brisa | fontes, matriz de consumidores, auditoria |
| Testes das rotas reais Web | Prumo (Codex) | `tests/compositionRoutes.route.manual.ts` |
| Coordenação e gates globais | Root | ordem, bloqueios e fechamento dos gates |
| Aceite | Luiz | aceite final |

## Contrato (resumo — fonte: `@laudousg/shared`)

**Requisição** (`clinical-composition/v1`):
- Identificação: `requestId`, `compositionId`, `revision`, `associationCode`.
- `writingStyle`: injetado **pelo servidor** a partir da conta. Corpo que traga `writingStyle` é recusado.
- `components[2]`: cada um com `componentId`, `categoryCode`, `acquisitionContextId` e `data {alteracoes, dados}`, que é o mesmo corpo da rota simples.
- `sharedStructures`: só `URINARY_BLADDER` no par abdome+próstata, com contexto igual e origem `ABDOMEN_TOTAL`. Em mamas+pelve é `[]`.

**Resposta de sucesso:** `document {title, technique, findings, conclusion, fullText}` e blocos com origem (`componentIds`, `categoryCodes`, `structureCode`). O schema garante id único, par categoria×componente e blocos só com ids listados.

**Resposta de erro:** `status: "error"`, com eco da identificação, `error {code, message}`, `conflicts?` e `components?` (`rendered|error|blocked`). Nunca traz documento.

**Envelope salvo** (ownership Web, não é transporte): `exam_state = { kind: "clinical-composition", envelopeVersion: 1, contractVersion, compositionId, revision, associationCode, primaryComponentId, sharedBladderId, components[{componentId, categoryCode, acquisitionContextId, uiState}], rendered{requestId, revision, fullText, blocks}, extras{calculatorBlocks, companionNotes}, draft, __presentation }`.
- `category_code` = `associationCode`.
- Sem migração: a coluna `exam_state jsonb` já existia.

## Critérios de aceite desta rodada

- [x] "Associar exame" oferece só os pares suportados (não aparece em tireoide, obstetrícia, MSK etc.).
- [x] Os componentes aparecem integrados na grade de cards, um grupo por componente, sem menu lateral de órgão.
- [x] Uma bexiga só no par abdome+próstata. Ela mora no grupo do abdome, é projetada idêntica no adaptador da próstata e só é compartilhada com o contexto transabdominal coincidente.
- [x] Mamas+pelve: nada compartilhado, BI-RADS só no grupo da mama e a pelve mantém sua bexiga e sua via.
- [x] O laudo composto vem do renderer canônico; o navegador não concatena texto clínico. Os blocos de calculadora, recomendações e observações continuam sendo inclusões explícitas do médico.
- [x] Uma pendência bloqueante em qualquer componente impede a requisição, e não aparece texto parcial.
- [x] Falha parcial (componente `error`/`blocked`) mostra erro nominal. Salvar é recusado **mesmo com texto editado à mão**.
- [x] Resposta antiga não vence: são conferidos `requestId`, `revision`, `compositionId` e `associationCode`, com `revision` monotônica.
- [x] A resposta é validada na fronteira Web: componente duplicado, categoria trocada e bloco de origem alheia são recusados (defesa em profundidade além do schema).
- [x] Editar um campo depois de editar o texto gera sugestão. O texto do médico é preservado.
- [x] Remover um componente descarta o estado dele. Reassociar cria outro componente, a partir do estado inicial. A bexiga do exame fica com o componente restante.
- [x] Trocar de categoria com associação aberta pede confirmação e encerra a associação. Nada fica reaproveitado em silêncio.
- [x] Salvar grava a composição inteira. Salvar de novo atualiza a mesma linha, com concorrência por `updated_at`.
- [x] Reabrir pelo histórico traz os estados dos dois componentes e o texto (inclusive o editado) idênticos.
- [x] Laudo legado reabre só como texto. O caminho de edição recusa legado e envelope de versão desconhecida ou incoerente.
- [x] Sem overflow horizontal de 1440 a 320 px.
- [x] Políticas RLS e concorrência de `web_reports` provadas em **Postgres 17 real temporário**, com a migração versionada `0018` aplicada sem alteração e as mesmas consultas do cliente e da rota (`tests/compositionRls.pg.manual.ts`, 9/9; também executado pelo root).
- [x] Metadados reais de produção lidos (só leitura, sem linhas de laudo): RLS ligada, policies de dono, grants e ausência de trigger em `updated_at` batem com o código.
- [ ] Ponta a ponta com Supabase Auth + PostgREST reais. **Impedimento:** o único projeto é produção (`laudousgmobile`, sem branches) e a máquina não tem Supabase CLI nem Docker. O script `tests/compositionPersistence.real.manual.ts` está pronto para uma stack local e se recusa a rodar contra produção.
- [x] Rotas reais `GET/PATCH /api/web-reports/[id]` e o proxy de composição testados importando os handlers reais, com Supabase e fetch substituídos no bundle (`tests/compositionRoutes.route.manual.ts`, Prumo): 21/21.
- [x] `laudo_text` é **derivado** do envelope (`savedTextOf` = rascunho + iniciais). PATCH com texto divergente → 400. Reabrir linha divergente → 422. A apresentação HTML também precisa conferir.

## Persistência: o que é real e o que é simulado

| Caminho | Situação |
|---|---|
| Primeira gravação | `INSERT` direto do cliente em `web_reports` com RLS. O caminho já existia; o envelope é validado **no cliente** (`buildEnvelope` → schema estrito) antes de enviar. Não se alega validação de envelope no servidor para o INSERT. |
| Coerência texto × estado | `laudo_text` = `appendInitials(draft.text, initials)` e a apresentação = `appendInitialsToReportHtml(draft.html, initials)`. As iniciais ficam no envelope **só na forma normalizada** (`/^[a-z]{0,4}$/`, a de `normalizarIniciais`); iniciais cruas como `A1B` são recusadas, porque o texto as normaliza e o HTML não. O cliente deriva o texto; PATCH e GET recusam divergência. |
| Regravação e reabertura | Rota autenticada `apps/web/src/app/api/web-reports/[id]/route.ts`: dono (RLS + `user_id`), envelope estrito, mesma `compositionId` e `updated_at` esperado (409 se mudou). |
| Metadado de produção (leitura) | `web_reports` com RLS ligada. Policies `select/insert/update/delete` por `auth.uid() = user_id`; o UPDATE em produção só tem USING (o arquivo `0018` tem WITH CHECK, e o teste SQL cobre as duas formas). `authenticated` tem SELECT/INSERT/UPDATE. Sem trigger: `updated_at` só muda quando o PATCH grava. `anon` tem SELECT na tabela, mas a RLS não devolve linha sem sessão (observação fora do escopo). |
| SQL real (Postgres 17 temporário) | `tests/compositionRls.pg.manual.ts`, 9/9. Cobre INSERT do dono, INSERT forjado recusado, SELECT isolado (outro usuário e anônimo), UPDATE alheio com 0 linhas, PATCH com versão aberta, `updated_at` antigo com 0 linhas, **duas abas simultâneas (só uma grava)**, transferência de dono recusada, e a forma de produção da política. **Não é Supabase Auth/PostgREST:** `auth.uid()` é emulado pelo claim `sub`, sem JWT nem HTTP. |
| Handlers reais, banco simulado | `tests/compositionRoutes.route.manual.ts` (Prumo), 21/21. |
| Browser | `tests/composition.browser.manual.ts`: persistência **SIMULADA** em memória, com renderer real. |
| Supabase Auth + PostgREST ponta a ponta | **Não executado** (impedimento acima). Pronto em `tests/compositionPersistence.real.manual.ts`, que exige stack local; as guardas de "sem credenciais" e "alvo de produção" foram provadas. |
| Prévia local | `http://127.0.0.1:4174`: renderer real, salvar/reabrir **SIMULADO**, com aviso visível na página. |

## Evidências (26/09, working tree sobre `d1f0b76`, sem commit)

| Gate | Resultado |
|---|---|
| `tests/compositionRls.pg.manual.ts`: Postgres 17 real temporário, migração `0018`, duas identidades, concorrência simultânea | PASS 9/9 (Atlas e root) |
| QA final Prumo (`docs/reviews/2026-09-26-final-release-qa.md`): `pnpm typecheck` 8/8, testes Web 16 suítes, lint API/Web, build API/Web | PASS; lint e build **globais** falham só no LAB (baseline: sem config ESLint; `NEXT_PUBLIC_SUPABASE_URL` ausente no prerender) |
| `apps/web` typecheck (`tsc --noEmit`) | PASS |
| `apps/web` lint (arquivos tocados) | PASS; só avisos antigos (`<img>`, `alt`) |
| `apps/web` `npm test` (16 suítes, inclui `composition.manual.ts`) | PASS |
| `tests/composition.manual.ts`: 15 verificações com `renderClinicalComposition` **real** (OBJETIVO, contexto vazio) | PASS |
| `tests/composition.browser.manual.ts`: 13 verificações, Chromium, renderer **real**, persistência **simulada**, salvar/reabrir com iniciais `/ab` | PASS |
| `tests/compositionRoutes.route.manual.ts`: handlers **reais** da Web e da API, Supabase/fetch simulados (Prumo) | PASS 21/21 (PATCH `A1B` → 400; GET com iniciais cruas → 422). Reteste independente do Prumo, relatório em `docs/reviews/2026-09-26-composition-routes-qa.md` |
| `apps/web` `next build` (inclui `/api/compositions/render` e `/api/web-reports/[id]`) | PASS |
| Gates conjuntos do root: lint web/API, typecheck web/API/shared, 16 suítes Web (logs `/tmp/laudousg-phase3-validation`) | PASS (antes da correção do PATCH; os checks afetados foram repetidos depois dela) |
| Regressão browser `workspaceTabs` (stub e `WORKSPACE_REAL_RENDER=1`), `mamariaForm`, `mamariaBirads`, `trisomyFormSync` | PASS |
| `renalMeasurements`, `peWeb`, `dopplerWeb` browser | FAIL, **já no baseline**: falham igual num worktree limpo em `d1f0b76` (seletores "Reduzido", "Idade na DPP", "Biometria e crescimento" anteriores a esta rodada) |
| Contrato/API (Sol): shared e API typecheck, 14 grupos renderer/composição, route manual, build API | PASS (relato do Sol) |
| Clínica: `prostata-medidas-estritas` 34/34, composição 14/5 grupos | PASS (relato da Clínica) |

Screenshots: `tmp-review/web-composition/abdome-prostata-{1440,1024,390,320}.png`.

Comandos (da raiz do repo; o Playwright fica fora do workspace):
```
TSX_TSCONFIG_PATH=$PWD/apps/api/tsconfig.json node --import tsx apps/web/tests/composition.manual.ts
PLAYWRIGHT_MODULE=<caminho>/playwright TSX_TSCONFIG_PATH=$PWD/apps/api/tsconfig.json node --import tsx apps/web/tests/composition.browser.manual.ts
COMPOSITION_PREVIEW=1 PORT=4174 TSX_TSCONFIG_PATH=$PWD/apps/api/tsconfig.json node --import tsx apps/web/tests/composition.browser.manual.ts
```

## Achados durante a integração

1. **Resolvido:** `adaptarMamaria` enviava `birads_final: null` e `exames_anteriores: []` no topo. A rota simples descartava em silêncio e a composição estrita recusava, o que fazia **toda** composição mamas+pelve falhar. Pela decisão do root, os dois campos foram removidos do adaptador; o BI-RADS continua em `correlacao`/achado.
2. **Resolvido:** a recusa de salvar ficava presa depois que a falha parcial se resolvia com rascunho manual (o texto não mudava). Agora o estado de salvar também é resetado com a nova resposta do motor.
3. **Resolvido (Prumo achou):** o PATCH aceitava `laudoText` diferente do envelope, e o histórico divergia da reabertura. Agora o texto é derivado do envelope, com iniciais; o PATCH recusa com 400 e a reabertura com 422.
4. **Resolvido (Prumo achou):** com iniciais cruas (`A1B`), o texto salvava `/ab` e o HTML `/A1B`, e o PATCH respondia 200. Agora o envelope aceita só iniciais normalizadas: PATCH → 400, GET → 422.
5. **Resolvido (Sol):** o schema de sucesso não garantia unicidade e pareamento de componentes. Endurecido no shared; a Web mantém a mesma checagem na fronteira.
6. **Registrado:** o envio estruturado do celular não é aplicado durante uma associação. Um aviso explícito impede que o dado caia fora dos componentes.
7. **Registrado:** o esquema visual (mama/feto) fica fora da associação até ter escopo por componente.

## File List (rodada completa, 26/09)

Todos no working tree sobre `d1f0b76`, sem commit.

**Frente Atlas — integração Web** (ownership liberada ao fechar)
- `apps/web/src/components/laudar/LaudarWebExperience.tsx` (M)
- `apps/web/src/components/laudar/AssociationPanel.tsx` (novo)
- `apps/web/src/lib/composition/{associations,buildRequest,contract,envelope,servidor,useComposicaoCanonica}.ts` (novos)
- `apps/web/src/app/api/compositions/render/route.ts` (novo)
- `apps/web/src/app/api/web-reports/[id]/route.ts` (novo)
- `apps/web/src/lib/webReports.ts` (M)
- `apps/web/src/app/app/gerar/page.tsx` (M)
- `apps/web/src/app/app/historico/page.tsx` (M)
- `apps/web/src/components/historico/{HistoryItem.ts,ReportDetail.tsx}` (M)
- `apps/web/src/components/analytics/types.ts` (M)
- `apps/web/src/lib/catalog/mamariaParaCatalogo.ts` (M: remoção de `birads_final`/`exames_anteriores`)
- `apps/web/tests/composition.manual.ts` (novo)
- `apps/web/tests/composition.browser.{manual.ts,tsx}` (novos)
- `apps/web/tests/compositionRls.pg.manual.ts` (novo)
- `apps/web/tests/compositionPersistence.real.manual.ts` (novo)
- `apps/web/tests/run-unit.cjs` (M)

**Sol — contrato e endpoint**
- `packages/shared/src/schemas/clinicalComposition.ts` (novo)
- `packages/shared/src/schemas/index.ts` (M)
- `apps/api/src/app/api/compositions/render/{route.ts,route.manual.ts}` (novos)
- `apps/api/src/server/renderer/composition/{contractAdapters.ts,renderClinicalComposition.ts}` (novos)
- `apps/api/src/server/renderer/composition/__tests__/clinical-composition-v1.manual.ts` (novo)

**Clínica — urinário/próstata**
- `apps/api/src/server/renderer/categories/{PROSTATA_SUPRAPUBICA,VIAS_URINARIAS,sharedUrinary}.ts` (M)
- `apps/web/src/lib/deterministic/organs/{prostataSuprapubica,urinaryShared}.ts` (M)
- `apps/web/src/lib/catalog/prostataParaCatalogo.ts` (M)
- `apps/api/src/server/renderer/catalog/__tests__/{prostata-medidas-estritas,bexiga-lesao-focal-descritiva}.manual.ts` (novos)
- `apps/api/src/server/renderer/__tests__/contrato-extracao-urinaria.manual.ts` (novo)

**Opus picker**
- `apps/web/src/components/laudar/ExamCategoryPicker.tsx` (M)
- `apps/web/src/components/laudar/categoryGroups.ts` (novo)
- `apps/web/tests/categoryPicker.browser.{manual.ts,tsx}` (novos)

**Prumo — QA**
- `apps/web/tests/compositionRoutes.route.manual.ts` (novo; Atlas ajustou uma fixture para ficar coerente e acrescentou casos de iniciais)

**Root**
- `README.md` (M: rodada de 26/09 e limites Web/native)

**Docs**
- `docs/stories/2026-09-26-clinical-composition-categories.md` (esta story)
- `docs/reviews/2026-09-26-{category-picker,clinical-composition-api,clinical-evidence,composition-cross-platform-audit,composition-routes-qa,final-release-qa,prostata-urinario-qa,urinary-prostate-clinical-validation}.md`

**Fora do commit:** `output/`, `supabase/.temp/`, `tmp-review/` (artefatos locais) e `scratchpad` (Postgres temporário, fora do repo).

## Change Log

- 26/09: story criada (genérica, cinco grupos).
- 26/09: persistência provada em SQL real (Postgres 17 temporário, migração `0018`, 9/9, repetido pelo root) e metadado de produção lido. Supabase Auth/PostgREST ponta a ponta fica registrado como impedimento, com o script pronto. File list completa da rodada.
- 26/09: correção das iniciais normalizadas no envelope (achado A1B do Prumo). Checks afetados repetidos: rotas 21/21, composition 15, browser 13, `npm test` Web 16, typecheck, lint e `next build` Web PASS.
- 26/09: escopo fechado em composição v1 com dois pares; integração Web, contrato/API e conteúdo urinário implementados. As rotas reais e as políticas SQL foram verificadas; o fluxo completo com Supabase Auth/PostgREST permanece não executado por ausência de ambiente de teste separado.
