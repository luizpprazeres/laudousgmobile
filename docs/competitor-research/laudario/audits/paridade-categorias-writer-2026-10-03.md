# Auditoria de paridade das 14 categorias do writer

Data: 03/10/2026. Auditoria somente leitura; nenhum código clínico ou arquivo existente foi alterado.

## Escopo e fotografia

- Lista auditada: `WRITER_CATEGORY_OPTIONS` em `apps/web/src/lib/writerCategories.ts:9-24`.
- Repositório principal (Web, Android/RN, API, `packages/*`, seeds): `laudousgmobile-def`, `main` em `a355b49`.
- iOS: `~/laudousg-swift/LaudoUSG`, commit `19adf66`, árvore limpa. Os caminhos iOS abaixo são relativos a esse repositório.
- Não foram consultados o ambiente de produção, o Supabase remoto, a App Store ou a Play Store. Quando o estado de produção aparece, vem dos crosswalks já revisados e está marcado como tal.

## Legenda

Escala do `GUIA-CLAUDE-CODE.md`, aplicada por coluna:

| Estado | Clientes (Web, Android/RN, iOS) | API/renderer | Contrato compartilhado | Esquema visual |
| --- | --- | --- | --- | --- |
| `ausente` | não aparece no seletor | sem rota para o código | código inexistente em `packages/shared` | nenhum esquema |
| `genérico` | achados em texto/ditado → writer | writer geral com bundle por categoria | só código, rótulo e `GenerateRequest`/SSE genéricos | — |
| `estruturado dormente` | formulário e contrato existem, gate desligado | renderer determinístico atrás de gate | schema clínico versionado não consumido | esquema derivado do contrato, atrás de gate |
| `estruturado ativo` | formulário, contrato, renderer e rota ativos | renderer determinístico ativo | schema clínico consumido pelos três clientes | esquema derivado do mesmo contrato do texto |
| `parcial` | componente isolado sem fonte clínica única | writer dedicado ou extração específica, sem contrato | sub-contrato tipado que cobre só uma parte, como o desenho | esquema gerado à parte do texto |

Critério adotado: uma calculadora utilitária compartilhada entre categorias, oferecida pelo menu geral de ferramentas e sem efeito no contrato do laudo, não promove a categoria a `parcial`. Ela aparece nas notas.

## Resumo

1. Nenhuma das 14 categorias tem formulário estruturado, dormente ou ativo, em plataforma alguma. Nas três plataformas, todas entram pelo fluxo de achados livres ou ditado.
2. Só duas têm componente específico:
   - `DOPPLER_VENOSO_MMII`: cartograma recebido depois do texto nos três clientes, writer dedicado e extração própria para o desenho na API.
   - `DOPPLER_RENAL`: writer dedicado com auditoria bloqueante, condicionado a `RENDERER_CATEGORIES`. O crosswalk aortorrenal registra esse gate vazio em produção em 03/10.
3. Nenhuma das 14 tem contrato clínico em `packages/shared`. `ClinicalModelCodeSchema` cobre só os cinco modelos novos. O único sub-contrato tipado é o `MapaVenoso` em `packages/schemes`, que descreve o desenho e não o laudo.
4. Texto e cartograma do venoso saem de duas chamadas de LLM independentes sobre o mesmo ditado. Nesta categoria, a fonte de verdade não é única.
5. O plano `plano-formularios-estruturados-web-2026-10-03.md` está correto para as 14 linhas. Esta auditoria apenas acrescenta gates, nuances do `_MEDIDAS` e código morto no iOS (ver "Divergências").

## Matriz

| # | Categoria | Web | Android/RN | iOS | API/renderer | Contrato compartilhado | Esquema visual |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `PAREDE_ABDOMINAL` | genérico | genérico | genérico | genérico (sem corpus versionado) | genérico | ausente |
| 2 | `PROSTATA_TRANSRETAL` | genérico | genérico¹ | genérico¹ | genérico (sem corpus versionado) | genérico | ausente |
| 3 | `ESCROTAL` | genérico | genérico | genérico | genérico (21 snippets) | genérico | ausente |
| 4 | `REGIAO_INGUINAL` | genérico | genérico | genérico | genérico (sem corpus versionado) | genérico | ausente |
| 5 | `PARATIREOIDE` | genérico | genérico | genérico | genérico (sem corpus versionado) | genérico | ausente |
| 6 | `GLANDULAS_SALIVARES` | genérico | genérico | genérico | genérico (7 snippets) | genérico | ausente |
| 7 | `DOPPLER_VENOSO_MMII` | genérico + mapa parcial | genérico + mapa parcial | genérico + mapa parcial | parcial (writer dedicado e extração do mapa, ambos atrás de gate) | parcial (`MapaVenoso`, só desenho) | parcial |
| 8 | `DOPPLER_VENOSO_MMII_MEDIDAS` | genérico | genérico | genérico | genérico (4 snippets; sem writer dedicado) | genérico | ausente² |
| 9 | `DOPPLER_ARTERIAL_MMII` | genérico | genérico | genérico | genérico (8 snippets) | genérico | ausente |
| 10 | `DOPPLER_FISTULA_AV` | genérico | genérico | genérico | genérico (sem corpus versionado) | genérico | ausente |
| 11 | `DOPPLER_RENAL` | genérico | genérico | genérico | parcial (writer dedicado + auditoria; gate `RENDERER_CATEGORIES`) | genérico | ausente |
| 12 | `TRANSFONTANELA` | genérico | genérico | genérico | genérico (sem corpus versionado) | genérico | ausente |
| 13 | `OCULAR` | genérico | genérico | genérico | genérico (sem corpus versionado) | genérico | ausente |
| 14 | `LIVRE` | genérico por definição | genérico por definição | genérico por definição | genérico (writer puro, sem bundle) | genérico | ausente |

¹ Calculadora de volume prostático local no RN e no iOS, compartilhada com a próstata suprapúbica e ausente no Web. Ver nota 2.
² Os consumidores do Sala e do iOS aceitariam o esquema, mas a API nunca o emite para `_MEDIDAS`. Ver nota 8.

Em todas as linhas, Web, Android/RN e iOS estão de fato no seletor. Nenhuma categoria é `ausente` nos clientes.

## Evidências por plataforma

### Web

- **Catálogo e rota.** `ExamCategoryPicker` marca as 14 com `mode: 'writer'` (`apps/web/src/components/laudar/ExamCategoryPicker.tsx:16`). `LaudarWebExperience` desvia qualquer `isWriterCategory` para `WriterCategoryWorkspace` (`apps/web/src/components/laudar/LaudarWebExperience.tsx:1410-1411`), antes dos ramos de modelos clínicos (`:1414`) e hepáticos (`:1418`).
- **Entrada.** É um único `textarea` de "Achados do exame" (`apps/web/src/components/laudar/WriterCategoryWorkspace.tsx:134-137`). O pedido leva apenas `raw_input` e `category_hint` (`:87-94`), validados por `apps/web/src/lib/writerGeneration.ts:14-27`. Não há estado clínico, formulário nem persistência estruturada. A edição salva só `final_output` (`WriterCategoryWorkspace.tsx:215-219`).
- **Esquema visual.** O evento `scheme` é descartado para toda categoria diferente de `DOPPLER_VENOSO_MMII` (`WriterCategoryWorkspace.tsx:97`). O mapa só abre depois de `done` (`:197-201`). O parser aceita apenas `venous-4view-1` (`apps/web/src/lib/writerVenousMap.ts:19-24`).
- **Modelos estruturados existentes, para comparação.** `CLINICAL_WEB_MODELS` lista só os cinco códigos novos, atrás de `NEXT_PUBLIC_CLINICAL_MODELS_V1` (`apps/web/src/lib/clinicalModels.ts:7-20`). Nenhum dos 14 está lá.
- **Calculadoras.** `apps/web/src/lib/calculators/` não tem volume prostático, ITB, RAR nem fluxo de fístula.

### Android/RN

- **Seletor.** As 14 estão em `RELEASED_CATS` (`apps/mobile/src/ui/tokens.ts:136`): parede `:139`, próstata TR `:142`, escrotal `:143`, inguinal `:144`, renal `:145`, venoso `:147`, venoso medidas `:148`, arterial `:149`, fístula `:150`, paratireoide `:152`, salivares `:154`, transfontanela `:163`, ocular `:164`, livre `:165`. O teste `apps/mobile/src/features/generate/categories.manual.ts:5-14` fixa essa lista.
- **Desvio para formulário.** Só ocorre com `isClinicalModelCode` ou com o gate hepático (`apps/mobile/app/generate.tsx:123-127`). Ambos ficam desligados por `APPROVED_CLINICAL_MODELS_ENABLED = false` e `HEPATIC_ANDROID_MODELS_ENABLED = false` (`tokens.ts:199-202`). As 14 seguem o fluxo genérico, que envia `category_hint: cat.id` (`generate.tsx:348`, `:810`).
- **Esquema visual.** O reducer aceita `scheme` em qualquer categoria quando o estado é `done` (`apps/mobile/src/features/generate/state.ts:181-187`). O parser aceita `venoso-anterior-1` e `venous-4view-1` (`apps/mobile/src/features/generate/venousSchemeEvent.ts:23-28`). O render fica em `generate.tsx:1510-1516`. Marcadores visuais editáveis existem só para `TIREOIDE` e `MAMARIA` (`apps/mobile/src/features/generate/visualSchemeState.ts:22`; `generate.tsx:1519-1524`).

### iOS

- **Enum e seletor.** O enum `ReportCategory` contém as 14 (`LaudoUSG/Models/Category.swift`): paratireoide `:9`, salivares `:11`, escrotal `:20`, inguinal `:21`, parede `:22`, próstata TR `:24`, transfontanela `:26`, venoso `:28`, medidas `:29`, arterial `:30`, fístula `:33`, renal `:34`, ocular `:37`, livre `:43`. `selectable` filtra apenas `isExperimental` e `isPendingClinicalActivation` (`:49-55`). Este último cobre só os cinco modelos novos (`:63-71`).
- **Contrato Swift e workspace.** `PendingClinicalModelContracts.categories` lista os mesmos cinco, e o rollout fica sempre desligado em Release (`LaudoUSG/Models/PendingClinicalModelContracts.swift:8-26`). `GenerateView` só abre `ClinicalModelWorkspace` para esses cinco (`LaudoUSG/Features/Generate/GenerateView.swift:75-80`). As 14 seguem o fluxo de ditado e achados.
- **Esquema visual.** O view model guarda o `scheme` apenas quando `examType == "VENOSO_MMII"` (`LaudoUSG/Features/Generate/GenerateViewModel.swift:706-709`). A entrada do esquema aparece para `dopplerVenosoMmii` e, quando já existe payload, para `dopplerVenosoMmiiMedidas` (`GenerateView.swift:919-922`; `LaudoUSG/Components/Sheets/PlusSheet.swift:433-438`). O render usa `VenousOrganicRenderer` (`LaudoUSG/Components/Sheets/VenousSchemaSheet.swift:250`).
- **Calculadora.** O volume prostático aparece para próstata transretal e suprapúbica (`PlusSheet.swift:401-404`; `LaudoUSG/Services/VolumeProstaticoCalculator.swift:3`).

### API/renderer

- **Caminho.** `resolveGenerationPath` só escolhe `renderer` quando a categoria está em `RENDERER_CATEGORIES` (`apps/api/src/server/pipeline/generationPathResolver.ts:24-43`). O default da variável é vazio (`apps/api/src/server/env.ts:74`). `LIVRE` sempre vai para `writer-pure` (`generationPathResolver.ts:16-21`; `apps/api/src/app/api/generate/route.ts:747-748`).
- **Writers dedicados.** Existem só dois, chamados dentro de `runRendererStream`:
  - `DOPPLER_VENOSO_MMII` (`apps/api/src/server/pipeline/renderer.ts:443-466`), com auditoria que apenas anota (`apps/api/src/server/pipeline/dopplerVenosoMmiiWriter.ts:68-69`);
  - `DOPPLER_RENAL` (`renderer.ts:468-491`), com auditoria bloqueante (`apps/api/src/server/pipeline/dopplerRenalWriter.ts:70-73`).

  Os dois figuram em `RENDERER_PROGRAMMATIC_CATEGORIES` (`apps/api/src/server/renderer/extraction.ts:136-137`). Fora do gate, voltam ao writer geral.
- **Writer geral.** As demais 12 categorias passam pelo bundle por categoria e estilo. Sem blocos validados, o laudo é bloqueado (`route.ts:797`), exceto em `LIVRE`/`TESTE`.
- **Mapa venoso.** Depois do `done`, uma segunda extração por LLM gera o desenho, com a chave `DOPPLER_VENOSO_MMII_SCHEME` (`extraction.ts:355-365`). Ela é emitida apenas para `DOPPLER_VENOSO_MMII` e atrás de `VENOUS_SCHEME_MAP` (`route.ts:1394-1417`; flag em `env.ts:263-267`). `VENOUS_SCHEME_4VIEW` escolhe o asset (`env.ts:268-272`).
- **Sanidade determinística.** `extractValues` lê seções de escrotal (`apps/api/src/server/pipeline/deterministicSanity/extractor.ts:579`), parede (`:665`), próstata TR (`:714`), transfontanela (`:731`), fístula (`:740`), renal (`:772`) e inguinal (`:808`). Porém `CATEGORY_SPECIFIC_CHECKS` só tem regras para obstétrica, Doppler obstétrico, tireoide, mamária, abdome total e pelve (`apps/api/src/server/pipeline/deterministicSanity.ts:59-66`). Para as 14, valem apenas as checagens genéricas de medida, lateralidade, datas, comandos e placeholders (`deterministicSanity.ts:110-120`).
- **Fallback fail-closed.** Vale só para os cinco modelos novos (`apps/api/src/server/clinicalReports/fallbackPolicy.ts:3-9`).
- **Normalização.** `FAMILY_RULES` mapeia paratireoide, salivares, parede, próstata TR, transfontanela, fístula, escrotal, ocular e inguinal (`apps/api/src/server/pipeline/categoryNormalization.ts:44-69`). Não há regra de família para `DOPPLER_RENAL`, `DOPPLER_VENOSO_MMII*` nem `DOPPLER_ARTERIAL_MMII`. Esses códigos dependem de o structurer emitir o valor canônico.

### Contrato compartilhado e banco

- **`packages/shared`.** Os 14 aparecem só como rótulo de exibição (`packages/shared/src/categoryPresentation.ts:17-46`). `ClinicalModelCodeSchema` contém apenas os cinco modelos novos (`packages/shared/src/clinicalModels/contracts.ts:3-9`).
- **`packages/schemes`.** Há schema de achados venosos (`packages/schemes/src/vascular/findings.ts:181`, `:200`) e a ponte determinística `buildMapaVenoso` (`packages/schemes/src/vascular/venousMap.ts:63`, `:142`). Eles alimentam o desenho, mas o texto do laudo não os consome.
- **Banco, só artefatos versionados.** Os 13 códigos não livres estão no seed com `active` padrão `true` (`packages/db/src/seeds/data.ts`): parede `:75`, escrotal `:92`, inguinal `:93`, próstata TR `:94`, paratireoide `:99`, salivares `:100`, venoso `:113`, medidas `:114`, arterial `:115`, fístula `:116`, renal `:117`, transfontanela `:122`, ocular `:123`; o default está em `packages/db/src/seeds/run.ts:39`. `LIVRE` vem de `packages/db/src/sql/0021_categorias_livre_teste.sql:5`. `DOPPLER_RENAL` também recebe o estilo objetivo pela migração `0015_doppler_obstetrico_objetivo.sql:20`, `:92`. Não existe tabela nem migração de contrato clínico para nenhuma das 14.
- **Corpus versionado.** Em `packages/knowledge/snippets/`: escrotal 21, venoso 8, arterial 8, renal 8, salivares 7, venoso medidas 4. Parede, próstata TR, inguinal, paratireoide, fístula, transfontanela e ocular têm 0. Livre não usa corpus. Para essas sete, o writer geral depende de blocos que já estejam no banco. Esta auditoria não consultou o banco remoto.

## Notas por categoria

1. **Parede abdominal.** Genérico nas três plataformas. Não há corpus versionado. As seções de sanidade não têm regra consumidora. O plano pede formulário por topografia e tipo de lesão ou hérnia.
2. **Próstata transretal.**
   - Genérico nas três plataformas.
   - O volume elipsoide é calculado em código local duplicado: RN em `apps/mobile/src/shared/calculators/volumes.ts:74` (sheet `apps/mobile/src/features/generate/VolumeProstaticoCalculatorSheet.tsx:48`); iOS em `VolumeProstaticoCalculator.swift`.
   - Essa regra não está em `packages/shared` nem no Web. O laudo não a usa como fonte. Quando o contrato nascer, o cálculo deve migrar para ele.
3. **Escrotal.** Genérico nas três plataformas. Tem o maior corpus versionado (21 snippets, incluindo torção e encaminhamento urgente). O crosswalk de bolsa testicular registra a necessidade de gates para torção. Hoje não existe gate estrutural, só a redação do writer.
4. **Região inguinal.** Genérico nas três plataformas. Não há corpus versionado. Manobras dinâmicas e lateralidade dependem do texto livre.
5. **Paratireoide.** Genérico nas três plataformas. Não há corpus versionado.
6. **Glândulas salivares.** Genérico nas três plataformas. Tem 7 snippets.
7. **Doppler venoso de MMII.**
   - **Clientes.** Genérico com mapa parcial nas três plataformas.
   - **API.** O texto vem do writer dedicado (com `RENDERER_CATEGORIES`) ou do writer geral com variantes `completo` e `tvp-only` (`apps/api/src/server/pipeline/bundleLoader.ts:83-94`). O mapa vem de outra extração (`apps/api/src/server/vascular/venousMapService.ts:25`).
   - **Sala.** Aceita o esquema (`apps/api/src/app/sala/[token]/page.tsx:98`; `apps/web/src/app/api/sala/schema/route.ts:26`).
8. **Doppler venoso de MMII com medidas.**
   - **API.** Não recebe o writer dedicado (`renderer.ts:443`) nem a variante `tvp-only` (`bundleLoader.ts:83`). Também não gera mapa (`route.ts:1396`).
   - **Web.** Descarta qualquer `scheme` dessa categoria (`WriterCategoryWorkspace.tsx:97`).
   - **iOS e Sala.** Ficam preparados para mostrar um mapa recebido (`GenerateView.swift:922`; `PlusSheet.swift:437`; `page.tsx:99`), mas o servidor nunca o envia.
   - **Conclusão.** Confirma o plano: a variante não percorre o fluxo da categoria base.
9. **Doppler arterial de MMII.** Genérico nas três plataformas. Tem 8 snippets, incluindo regra de cálculo do ITB em `packages/knowledge/snippets/DOPPLER_ARTERIAL_MMII/regra/itb-calculo.md`. Esse cálculo existe apenas como instrução ao writer. Não há derivação determinística em código.
10. **Doppler de fístula AV.** Genérico nas três plataformas. Não há corpus versionado. A extração de sanidade lê volume de fluxo (`extractor.ts:740-747`), mas nenhuma regra usa o valor.
11. **Doppler renal.**
    - **Clientes.** Genérico nas três plataformas.
    - **API.** Parcial. Há schema de extração local da API (`apps/api/src/server/renderer/categories/DOPPLER_RENAL.ts:23-59`), que o caminho do writer não usa (`renderer.ts:468-491` devolve `findings: null`). O writer é dedicado e a auditoria bloqueia.
    - **Produção.** O crosswalk aortorrenal (`crosswalk-doppler-aortorrenal-2026-10-03.md:17`) registra o writer desligado em produção.
    - **Personalização.** `caminhoDeGeracao.ts:34` trata renal e venoso como writer sem flag. Isso vale para a personalização e coincide com o writer geral quando o gate está fora, então não há conflito.
12. **Transfontanelar.** Genérico nas três plataformas. Não há corpus versionado. A extração de sanidade lê o índice de Levene (`extractor.ts:731-738`) sem regra consumidora. É a próxima prioridade do estudo.
13. **Ocular.** Genérico nas três plataformas. Não há corpus versionado.
14. **Laudo livre.** Genérico por definição nas três plataformas. Na API é writer puro, sem bundle e com guardas apenas consultivas (`generationPathResolver.ts:16-21`).

## Divergências e riscos de fonte de verdade

1. **Texto e mapa venoso vêm de duas extrações independentes.** O writer escreve a partir do ditado. Depois do `done`, o mapa sai de uma segunda chamada (`route.ts:1394-1417`). Uma divergência entre as duas não é detectada por nenhuma checagem. Lado, segmento ou estado podem diferir entre o laudo e o desenho exibido e enviado ao Sala.
2. **Os clientes filtram o `scheme` de formas diferentes.** O Web filtra por categoria (`WriterCategoryWorkspace.tsx:97`). O RN não filtra (`state.ts:181-187`). O iOS filtra por `examType` (`GenerateViewModel.swift:707`). Hoje o efeito é nulo porque a API só emite o evento para `DOPPLER_VENOSO_MMII`. Ele deixa de ser nulo quando outra categoria ganhar esquema.
3. **Os clientes aceitam versões de asset diferentes.** O Web aceita só `venous-4view-1` (`writerVenousMap.ts:22`). O RN aceita também `venoso-anterior-1` (`venousSchemeEvent.ts:25`). Com `VENOUS_SCHEME_4VIEW` desligado, o Web não mostra o mapa que o RN mostra.
4. **O iOS tem uma segunda regra venosa local, sem uso.** `LaudoUSG/Services/VenousFindingsParser.swift:3-11` (texto → achados) e `LaudoUSG/Components/VenousCartographyView.swift` não são referenciados fora dos próprios arquivos. Pelo `git grep`, o parser também não aparece nos testes. É código morto, mas é uma fonte paralela de interpretação clínica que pode ser religada por engano.
5. **Há regras derivadas fora de `packages/shared`.** O volume prostático vive em RN e iOS. O ITB vive só em snippet. VPS, RAR e IR do renal vivem só no prompt e na auditoria do writer.
6. **O estado de produção não foi verificado nesta auditoria.** Os valores de `RENDERER_CATEGORIES`, `VENOUS_SCHEME_MAP` e `VENOUS_SCHEME_4VIEW` em produção e os blocos de bundle no banco para as sete categorias sem corpus versionado ficaram de fora. A matriz descreve o código. Para o renal, o estado de produção vem do crosswalk de 03/10.

## Confronto com o plano de 03/10

| Linha do plano | Resultado |
| --- | --- |
| As 14 abrem `WriterCategoryWorkspace` no Web | Confirmado (`LaudarWebExperience.tsx:1410-1411`) |
| Renal: genérico nos três clientes; writer dedicado dormente na API | Confirmado; o dormente depende de `RENDERER_CATEGORIES` |
| Venoso MMII: genérico com mapa parcial nos três clientes | Confirmado; o mapa também depende de `VENOUS_SCHEME_MAP`, e o Web exige o asset 4 vistas |
| Venoso com medidas: não percorre o fluxo da base | Confirmado. Faltam writer dedicado, variante `tvp-only` e mapa; o Web descarta o mapa |
| Demais 11 linhas: genérico nas três plataformas | Confirmado |
| Laudo livre: manter livre | Confirmado; writer puro na API |

Nenhuma linha do plano precisa ser rebaixada ou promovida. O critério de pronto do plano (contrato versionado em `packages/shared`, formulário, renderer determinístico e mesma fonte para texto e esquema) continua não atendido por nenhuma das 14.

## Provas mínimas antes de sair do modo genérico

Para cada categoria, seguindo `GUIA-CLAUDE-CODE.md` e o critério de pronto do plano:

- contrato compartilhado em `packages/shared` com estados `não avaliado`, `normal`, `alterado` e `limitado`;
- derivados determinísticos no contrato: RAR, ITB, volume prostático e fluxo de fístula;
- renderer que produza texto e esquema do mesmo objeto, com fim da segunda extração no venoso;
- filtro de `scheme` igual nos três clientes;
- remoção ou isolamento de `VenousFindingsParser.swift`;
- casos normais, alterados, incompletos, de lateralidade, unidades e limites, com serialização ponta a ponta em Web, Android/RN e iOS antes de qualquer gate.
