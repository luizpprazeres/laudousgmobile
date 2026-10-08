# Cruzamento Laudário × LaudoUSG — Doppler de artérias mesentéricas

Data: 07/10/2026. O lado do Laudário vem de `cases/doppler-arterias-mesentericas-2026-10-07.md`, relato de um operador autorizado no Chrome com dados sintéticos e modelo restaurado no fim. O lado do LaudoUSG foi conferido no código da `main` em `0b03101` e do iOS em `bce4604`, mais duas provas sintéticas só de leitura com o caminho real da Web (`initialExamState(dopplerMesenterico)` → `composeReport`): a probe versionada `audits/probes/probe-mesenterico-2026-10-05.ts` (saída igual à de 05/10) e uma prova espelho dos três cenários do operador, guardada fora do repositório (`probe-mesent-espelho-1007.ts`, scratchpad da sessão). Nenhum código clínico, teste, índice ou commit foi alterado. As referências anteriores são `audits/lote2/doppler-arterias-mesentericas-2026-10-05.md`, base `01155d0`, e o preflight `/tmp/laudario-mesentericas-preflight-2026-10-07.md`.

Rótulos usados: **observado** (UI do concorrente ou execução no LaudoUSG), **inferido**, **candidato a lacuna**, **gap confirmado**. Gap confirmado exige ausência em Web, RN, iOS e shared.

## Síntese

O MVP Web do LaudoUSG (`2a6ac46`) não mudou desde 05/10. Nos três cenários, o LaudoUSG é **mais conservador** que o Laudário: abre em branco e bloqueia, não gradua estenose sozinho e não afirma resposta pós-prandial. Mas ele **compartilha** dois riscos com o concorrente: vaso marcado como avaliado sem nenhuma velocidade sai normal, e a técnica declara a fase pós-prandial sem dado dessa fase. O Laudário tem dois derivados que nos faltam em todas as plataformas: **RMA** e **medidas pós-prandiais por vaso**. As duas incoerências observadas no concorrente (I1 e I2) nascem de seções do laudo montadas por fontes diferentes. É o mesmo risco que a guia do estudo manda registrar.

| Cenário | Laudário (observado) | LaudoUSG atual (observado na prova) | Classificação |
| --- | --- | --- | --- |
| Baseline | abre normal; TC e AMS normais sem VPS/VDF; AMI desligada | abre **em branco** e bloqueia: jejum não informado + nenhum vaso avaliado (`dopplerMesenterico.ts:110-112`, `:234-238`) | o LaudoUSG é **mais seguro**; não reproduzir o concorrente |
| Modelo normal escolhido | — | TC e AMS “pérvios, padrão habitual” e “sem sinais de estenose” sem VPS; AMI “não avaliada” (`:66`, `:163`, `:168`) | **risco compartilhado**; candidato a lacuna (decisão clínica: exigir VPS) |
| Protocolo pós-prandial (I1) | técnica muda; corpo fica de jejum; AMS recebe resposta pós-prandial normal sem medida, campos desabilitados | técnica passa a dizer “em jejum e após refeição”; corpo e conclusão idênticos aos do jejum; não há campo pós-prandial (`:247-251`, `:256`) | metade de I1 **reproduzida** no LaudoUSG (técnica sem dado); medidas por fase = **gap confirmado** |
| TC: aorta 100, placas, aliasing, VPS 240, VDF 60 | RMA 2,4; conclui estenose ≥ 50% automaticamente | corpo: aceleração focal com VPS/VDF e placas; aorta descrita; conclusão “aumento focal … sem estenose confirmada”; com confirmação, “estenose significativa” sem grau (`:144-157`, `:220-229`); sem RMA (`:13`); sem campo de aliasing | RMA = **gap confirmado**; graduação automática **não deve ser reproduzida** |
| AMI ligada sem medida | entra normal | “Avaliado” sem medida: AMI “pérvia, padrão habitual” e “sem sinais de estenose” (`:159-170`) | **risco compartilhado** (mesma falsa normalidade) |
| AMI não visualizada (I2) | corpo e conclusão com limitação; técnica afirma três artérias adequadas | não há “não visualizada”. “Limitada” afirma fluxo detectável sem dado (`:161-162`); “não avaliada” não aceita motivo e bloqueia se houver texto (`:123-128`). A técnica é genérica e não nomeia vasos (`:240`), então I2 **não ocorre** | estado “não visualizado (motivo)” = **gap confirmado**; nosso defeito M3 persiste |
| Restauração | volta ao baseline | apagar a alteração não deixa resíduo (M4 de 05/10) | equivalente |

## As duas incoerências observadas no concorrente

| id | O que acontece | Origem provável | Existe no LaudoUSG? |
| --- | --- | --- | --- |
| **I1** | a técnica declara a fase pós-prandial, o corpo segue de jejum, e a AMS recebe resposta pós-prandial normal por padrão com campos pós vazios e desabilitados | técnica ligada ao protocolo; resposta pós-prandial com valor padrão não derivado de medida (**inferido**) | **parcial**: a técnica declara a fase sem dado (`dopplerMesenterico.ts:248`), mas não há frase de resposta pós-prandial |
| **I2** | AMI não visualizada aparece no corpo e na conclusão, mas a técnica afirma avaliação adequada das três artérias | técnica fixa, sem leitura do estado por vaso (**inferido**) | **não**: a técnica não nomeia vasos. O risco reaparece se a técnica passar a listá-los sem derivar do estado |

## Estado por plataforma

| Plataforma | Evidência | Classificação |
| --- | --- | --- |
| Web | `apps/web/src/lib/deterministic/organs/dopplerMesenterico.ts:1-261`; registro em `apps/web/src/lib/deterministic/index.ts:44,92,118`; grupo Vascular em `apps/web/src/components/laudar/categoryGroups.ts:55`, busca em `:159`; caminho estruturado em `apps/web/src/lib/writerCategories.ts:12`; pendência de exame em `organs/pendenciasLocais.ts:14,27`, somada e bloqueante em `apps/web/src/components/laudar/LaudarWebExperience.tsx:698-703`, `:960-966`, `:978-981`; teste em `apps/web/tests/dopplerMesentericoStructured.manual.ts:33-127` | **estruturado ativo, composição local** (sem renderer canônico) |
| API (ditado) | código fora do seed (`packages/db/src/seeds/data.ts:58` em diante); sem `apps/api/src/server/renderer/categories/DOPPLER_MESENTERICO.ts`; código com “ABDOM” vira `ABDOMEN_TOTAL_DOPPLER` (`apps/api/src/server/pipeline/categoryNormalization.ts:75`); nenhuma ocorrência de “tronco celíaco” ou “artéria mesentérica” em `apps/api` | **ausente**; roteamento errado = **defeito confirmado** (probe de 05/10, reexecutada em 07/10) |
| Conhecimento | sem `packages/knowledge/snippets/DOPPLER_MESENTERICO/` | **ausente** |
| Android/RN | seletor fechado em `apps/mobile/src/features/generate/categories.manual.ts:5-17`; só a **veia** mesentérica do Doppler hepático (`apps/mobile/src/features/generate/clinicalModels.ts:38,45`) | **ausente** |
| iOS | `ReportCategory` sem o código (`laudousg-swift/LaudoUSG/LaudoUSG/Models/Category.swift:3-266`); só `superiorMesentericVein` (`Models/PendingClinicalModelContracts.swift:119,152`) | **ausente** |
| shared | só o rótulo em `packages/shared/src/categoryPresentation.ts:59`; fora de `ClinicalModelCodeSchema` (`packages/shared/src/clinicalModels/contracts.ts:3-10`) | **ausente** (sem contrato clínico) |

**Fonte de verdade:** na Web, técnica, corpo e conclusão saem do mesmo módulo, mas a técnica lê só os controles do exame (`resolveTecnica`, `:247-251`), não o estado por vaso. É a mesma separação que gera I1 e I2 no concorrente. O ditado não tem contrato para esta categoria. A Sala e os esquemas visuais não se aplicam. Web e ditado **não compartilham** nenhuma definição de vaso mesentérico.

## Lacunas confirmadas (Web, RN, iOS e shared)

1. **Medidas pós-prandiais por vaso** (VPS/VDF na fase pós). O Laudário tem os campos, embora desabilitados no cenário. No LaudoUSG não existem em nenhuma plataforma; a Web só tem a opção de fase (`:256`).
2. **RMA derivada** (VPS do vaso ÷ VPS da aorta). O Laudário calcula (observado). No LaudoUSG, a aorta existe só na Web e a razão está declarada fora do MVP (`:13`, `:220-229`).
3. **Estado “não visualizado (motivo)” por vaso.** O Laudário tem para a AMI. No LaudoUSG está ausente; os estados existentes ou afirmam fluxo (limitada) ou recusam o motivo (não avaliada).
4. **Contrato compartilhado** de artérias mesentéricas e **entrada por ditado** (seed, renderer, extrator, snippets, RN, iOS). Ausentes.
5. **Bloqueio no `ABDOMEN_TOTAL_DOPPLER`** para termos arteriais mesentéricos. Ausente (P0 de 05/10, não implementado).
6. **Aliasing ou turbulência por vaso.** O Laudário tem o campo; no LaudoUSG está ausente. Se entra no laudo é decisão de revisão médica.

**Candidatos a lacuna** (dependem de decisão clínica, não de ausência):

- exigir VPS para a frase “sem sinais de estenose” no modelo normal e em vaso marcado como avaliado;
- aviso quando a VPS da lesão for menor ou igual à basal (M5 de 05/10);
- faixa plausível de velocidade (M6b: “1,4” aceito como cm/s).

## Comportamento útil do concorrente

- **RMA calculada pelo sistema** a partir das duas velocidades, nunca digitada.
- **AMI opcional e desligada** no início: fora do laudo, em vez de normal. É equivalente ao nosso “não avaliada”.
- **“Não visualizada” como estado próprio**, que restringe corpo e conclusão.
- **Medidas por fase previstas no modelo**, mesmo que mal ligadas ao texto.

## Comportamento que não deve ser reproduzido

- **Normalidade presumida no baseline e em vaso ligado sem medida.** O LaudoUSG já evita no estado inicial; ainda falha quando o médico escolhe o modelo normal ou marca “Avaliado” sem velocidade.
- **Resultado de fase com valor padrão** (I1). Resposta pós-prandial normal sem medida pós é falsa normalidade.
- **Técnica que não lê o estado** (I1, I2). A técnica não pode afirmar fase realizada nem vasos avaliados que o estado não sustenta.
- **Graduação automática de estenose** (≥ 50%) sem confirmação médica e sem fonte de limiar validada.
- **Redação**: nenhuma frase do concorrente deve ser reaproveitada. A redação do LaudoUSG é original, no estilo Domingos.

## Salvaguardas propostas

1. **Técnica derivada do estado.** Fases citadas = fases com pelo menos uma medida registrada. Vasos citados, se a técnica os listar, = vasos com estado avaliado. Vaso limitado ou não visualizado entra como restrição. Jejum não confirmado vira frase própria, sem também afirmar “em jejum” (corrige M3 de 05/10).
2. **Pós-prandial só com dado.** Marcar a fase habilita VPS/VDF pós por vaso. Fase marcada sem nenhuma medida pós gera pendência bloqueante. A resposta pós-prandial nunca tem valor padrão; quando existir, é descritiva a partir do par jejum/pós e qualquer juízo de normalidade depende de confirmação médica.
3. **RMA como derivado, não como diagnóstico.** Calculada só com VPS do vaso e da aorta válidas, uma casa decimal, exibida no corpo. Nenhum grau automático. A graduação, se adotada, usa limiar versionado com fonte citada, aprovado em revisão médica, e só aparece na conclusão com confirmação.
4. **“Não visualizado (motivo)” por vaso.** Exclusivo com medidas e alterações; nunca afirma fluxo; restringe a conclusão e a técnica. “Limitada” passa a exigir dado do segmento visto antes de qualquer frase de fluxo.
5. **Normalidade só com medida.** “Sem sinais de estenose” exige VPS válida no vaso. Sem VPS: aviso no modelo normal ou pendência, conforme revisão médica. Faixa técnica de velocidade bloqueia valores implausíveis.
6. **Placas e aliasing descritivos.** Entram no corpo e não graduam estenose sozinhos.

## Contrato mínimo proposto (shared, versionado; reforça §6 de 05/10)

```
DOPPLER_MESENTERICO v1
exame:
  jejum: confirmado | nao_confirmado | nao_informado        # nao_informado bloqueia
  fases: [jejum] | [jejum, pos_prandial]
  aorta_ref: { vps_cms? }
vaso[id ∈ TC, AMS, AMI]:
  estado: nao_avaliado | avaliado | limitado(+motivo) | nao_visualizado(+motivo)
  jejum:        { vps_cms?, vdf_cms? }                      # faixa técnica a definir
  pos_prandial: { vps_cms?, vdf_cms? }                      # só se fase marcada
  placas: nao_informado | ausentes | presentes
  aliasing: bool?                                           # descritivo
  alteracao: nenhuma | aceleracao_focal{vps_lesao, vdf_lesao?, confirmada} | fluxo_nao_detectado{confirmada}
  TC.respiratoria: { vps_insp?, vps_exp?, compressao_confirmada }
derivados (código, nunca digitados):
  rma = vaso.jejum.vps / aorta_ref.vps   # só com os dois válidos; 1 casa
  tecnica.fases = fases com ≥1 medida;  tecnica.vasos = vasos com estado avaliado|limitado
regras:
  nao_visualizado ⇒ sem medidas, sem frase de fluxo
  "sem sinais de estenose" ⇒ vps válida
  pos_prandial marcada ⇒ ≥1 vaso com medida pós
  grau de estenose ⇒ confirmada + limiar versionado aprovado
  conclusao.cita(x) ⇒ corpo.descreve(x); tecnica coerente com estados
```

## Provas necessárias antes de ativar

1. Estado inicial bloqueia; nenhum vaso normal sem VPS.
2. Fase pós-prandial sem medida pós bloqueia; com medida, técnica e corpo citam a fase.
3. Aorta 100 e TC 240: RMA 2,4 exibida; sem confirmação, conclusão descritiva sem grau. Sem aorta: sem RMA e sem erro.
4. AMI não visualizada por gases: corpo, conclusão e técnica restritos, sem frase de fluxo.
5. Jejum não confirmado: técnica sem contradição; limitação visível.
6. VPS “1,4” ou acima da faixa técnica: bloqueio.
7. Apagar a velocidade remove RMA, grau e conclusão sem resíduo.
8. Ditado com “tronco celíaco” ou “artéria mesentérica” não cai em `ABDOMEN_TOTAL_DOPPLER` como normal.
9. Paridade: o mesmo estado gera o mesmo texto pelo formulário Web e pelo extrator no RN e no iOS.

## Melhorias sugeridas ao LaudoUSG

| # | Controle ou dado | Efeito no corpo e na conclusão | Salvaguardas | Web | Prompt mobile | Prioridade | Evidência e pendência | Tipo |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Pendência no `ABDOMEN_TOTAL_DOPPLER` para termos arteriais mesentéricos; código no seed | impede abdome normal para exame mesentérico | bloqueio com motivo | — | o extrator reconhece TC, AMS e AMI arteriais | **P0** | probe 05/10 reexecutada em 07/10 | corrige **defeito confirmado** |
| 2 | Técnica derivada do estado (fases e vasos) | técnica coerente com corpo e conclusão | regra “técnica ⊆ estado” em teste | `resolveTecnica` passa a ler os vasos (`dopplerMesenterico.ts:247-251`) | — | **P1** | I1/I2 no Laudário; M3 e E1b no LaudoUSG | corrige **defeito confirmado** |
| 3 | Estado “não visualizado (motivo)” por vaso | corpo e conclusão restritos, sem fluxo | exclusivo com medidas | nova opção em Avaliação (`:85`) | “não vi a AMI por gases” vira o estado | **P1** | Laudário observado (C3); M3/M3c | **gap confirmado** |
| 4 | VPS/VDF pós-prandial por vaso | corpo por fase; conclusão sem juízo sem confirmação | fase sem medida bloqueia; nunca padrão normal | subcampos por vaso visíveis com a fase | extrair a fase só se ditada, com valores | **P1** | Laudário observado (I1); M2b | **gap confirmado** |
| 5 | VPS obrigatória para “sem sinais de estenose” | elimina normal sem medida | aviso ou bloqueio, conforme revisão | validação em `:159-170` | nunca presumir normalidade sem velocidade | **P1** | E3 e M1c; Laudário igual | candidato a lacuna (decisão clínica) |
| 6 | RMA derivada e exibida | corpo com a razão; conclusão sem grau automático | só com as duas VPS válidas; grau só com confirmação e limiar aprovado | campo somente leitura ao lado da VPS | o código calcula; o extrator não | **P2** | Laudário observado (C2) | **gap confirmado**; limiar depende de revisão médica |
| 7 | Faixa técnica de velocidade | evita “1,4 cm/s” normal | bloqueio fora da faixa | `velocidade()` (`:51-57`) | preservar unidade ditada; m/s só com unidade | **P1** | M6b | corrige **defeito confirmado** |
| 8 | Aliasing por vaso | descritivo no corpo | não gradua sozinho | toggle por vaso | extrair só se ditado | **P3** | Laudário observado (C2) | **gap confirmado**; relevância depende de revisão médica |
| 9 | Contrato em `packages/shared` + RN, iOS, renderer e snippets | uma fonte para Web e ditado | versionado, dormente até aprovação | consome o contrato | roteiro do extrator por vaso (§6 de 05/10) | **P2** | ausência em todas as camadas | **gap confirmado** |

**Para o orquestrador:** a salvaguarda 1 (técnica derivada do estado) vale para todos os Doppler com fases ou vasos opcionais: aorta e ilíacas, transplante renal, temporais e abdome com Doppler. Para a RMA, o padrão a seguir é o contrato renal **dormente** em shared: a razão exige as VPS de origem (`packages/shared/src/clinicalModels/dormant/dopplerRenal.ts:452`) e a regra de tolerância está pendente (`:496`). O renderer renal ativo da API **não** serve de modelo, porque gradua estenose por VPS > 250 sem confirmação (`apps/api/src/server/renderer/categories/DOPPLER_RENAL.ts:108`).

## Ficha de insumo para a síntese clínica

- **Estruturas:** aorta de referência; TC; AMS; AMI; preparo (jejum) e fases.
- **Estados selecionáveis por vaso:** não avaliado, avaliado, limitado (+ motivo), não visualizado (+ motivo).
- **Alterações vistas no concorrente:** placas, aliasing, estenose graduada (≥ 50%), resposta pós-prandial, AMI não visualizada.
- **Medidas e unidades:** VPS e VDF em cm/s por vaso e por fase; VPS da aorta; RMA adimensional com 1 casa; VPS do TC na inspiração e na expiração (só no LaudoUSG).
- **Dependências:** RMA ← VPS do vaso + VPS da aorta; técnica ← fases com medida + estados dos vasos; conclusão de estenose ← VPS da lesão + confirmação; oclusão ← fluxo não detectado + vaso sem limitação + confirmação.
- **Corpo:** por vaso, estado, velocidades por fase, placas, aliasing, RMA; limitações.
- **Conclusão:** só vasos avaliados; achados descritivos sem confirmação; estenose ou oclusão só confirmadas; escopo restrito quando houver limitação ou jejum não confirmado; nunca “exclui isquemia”.
- **Riscos que exigem confirmação médica:** limiares de VPS, VDF e RMA para graduação; juízo da resposta pós-prandial; compressão pelo ligamento arqueado; oclusão; redação final de todas as frases.

## Evidências relacionadas

- `cases/doppler-arterias-mesentericas-2026-10-07.md` (observação do concorrente)
- `audits/lote2/doppler-arterias-mesentericas-2026-10-05.md` (provas M1–M6b e requisitos)
- `audits/preflight-doppler-arterias-mesentericas-2026-10-05.md` (preflight original)
- `audits/probes/probe-mesenterico-2026-10-05.ts` (probe reexecutada em `0b03101`)
- `/tmp/laudario-mesentericas-preflight-2026-10-07.md` (estado no HEAD e roteiro da UI)
