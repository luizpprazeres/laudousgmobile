# Preflight — Doppler de artérias mesentéricas

Data: 05/10/2026. Rodada preparatória somente de leitura, sem navegador e sem dados de pacientes. O acesso ao navegador não estava disponível nesta sessão, então nada do concorrente foi observado além do catálogo. Este arquivo não altera código clínico, o status nem a fila; ele prepara a observação e o crosswalk seguintes.

Base verificada: worktree `docs/laudario-preflights-2026-10-05` em `4d5ad45` (inclui os MVPs Web estruturados de arterial MMII e FAV). App iOS lido em `laudousg-swift/LaudoUSG/LaudoUSG/`.

## Escopo e limites

- Exame: Doppler de artérias mesentéricas (grupo Vascular abdominal do catálogo, ao lado de Aortorrenal, Aorta e Ilíacas, Transplante Renal e Hepático).
- Prova mínima prevista pela fila: normal; estenose; preparo/limitação (`fila-e-mapa-canonico-2026-10-03.md:14`).
- Limites: um exame, até três cenários sintéticos, interface normal, sem endpoints privados, sem copiar, imprimir ou finalizar; restaurar o modelo ao fim. Achado do concorrente não vira requisito clínico (`GUIA-CLAUDE-CODE.md:19`).

## Concorrente: observado, inferido e não observado

| Rótulo | Conteúdo |
| --- | --- |
| `observado` | o exame existe como modelo próprio no catálogo de Ultrassonografia, no grupo vascular abdominal |
| `inferido` | é tratado como exame independente de Abdome com Doppler e de Doppler Hepático, porque o catálogo os separa |
| `não observado` | vasos oferecidos, fases (jejum/pós-prandial), variação respiratória, medidas, limiares, presets, conclusão, recomendações e restauração |

## Estado atual no LaudoUSG

Busca por `artéria mesentérica`, `tronco celíaco`, `celíaco`, `celiac`, `ligamento arqueado`, `isquemia mesentérica/intestinal` e `angina abdominal/intestinal` em `apps/web/src`, `apps/mobile/src`, `apps/mobile/app`, `apps/api/src`, `packages/shared/src`, `packages/db/src`, `packages/knowledge/snippets`, `supabase/migrations` e no app iOS: **nenhuma ocorrência**. O único vaso mesentérico existente é venoso.

| Camada | Estado | Evidência |
| --- | --- | --- |
| Web | **ausente** | fora de `STRUCTURED_WEB_CATEGORY_CODES` e `WRITER_CATEGORY_OPTIONS` (`apps/web/src/lib/writerCategories.ts:2-12`); fora do grupo Vascular (`apps/web/src/components/laudar/categoryGroups.ts:55`) |
| Android/RN | **ausente** | lista esperada do seletor (`apps/mobile/src/features/generate/categories.manual.ts:5-14`) |
| iOS | **ausente** | sem caso em `ReportCategory` (`laudousg-swift/LaudoUSG/LaudoUSG/Models/Category.swift:3-43`) |
| API | **ausente** | sem renderer, writer, auditoria ou regra de família (`apps/api/src/server/pipeline/categoryNormalization.ts:40-77`) |
| Banco versionado | **ausente** | sem código no seed (`packages/db/src/seeds/data.ts:58-128`) |
| Shared | **ausente** | `ClinicalModelCodeSchema` tem seis modelos, nenhum mesentérico (`packages/shared/src/clinicalModels/contracts.ts:3-10`) |
| Conhecimento | **ausente** | sem pasta em `packages/knowledge/snippets/`; o glossário vascular do ASR não tem termos esplâncnicos arteriais (`apps/api/src/server/asr/medicalGlossary.ts:80`) |

Resultado: **gap confirmado por busca** nas três plataformas e no contrato compartilhado. O crosswalk deve repetir a busca após a observação.

### Vizinho mais próximo: Abdome total com Doppler e Doppler hepático

- `HepaticVascularCoreSchema` cobre veia porta, veias hepáticas, veia esplênica, **veia** mesentérica superior e artéria hepática comum (`packages/shared/src/clinicalModels/contracts.ts:47-59`). `AbdomenTotalDopplerSchema` apenas estende esse núcleo (`contracts.ts:61-68`). Não há tronco celíaco, artéria mesentérica superior nem inferior.
- O modelo de conhecimento do abdome com Doppler afirma, sem medida, “veia cava inferior e aorta abdominal de calibres e contornos normais” e alças intestinais habituais (`packages/knowledge/snippets/ABDOMEN_TOTAL/modelo/template-doppler-esplancnico.md:39-40`); a tabela esplâncnica é venosa, com a artéria hepática como único vaso arterial (`template-doppler-esplancnico.md:44-52`).

**Risco de roteamento (`inferido`):** se o structurer emitir um código não canônico contendo `ABDOM` (por exemplo “Doppler abdominal”) e o ditado afirmar Doppler, a família genérica o envia para `ABDOMEN_TOTAL_DOPPLER` (`categoryNormalization.ts:75`, `categoryNormalization.ts:128-130`). Um código como `DOPPLER_MESENTERICO`, sem `ABDOM`, não casa com nenhuma família e cai no `category_hint` ou volta não normalizado (`categoryNormalization.ts:156-169`). No primeiro caso, o laudo herdaria o abdome normal completo e um núcleo portal sem artérias mesentéricas; achados arteriais ficariam sem campo próprio. Não foi testado com ditado real.

**Padrão reaproveitável:** os contratos Web MVP recentes de arterial MMII e FAV já usam segmento com `assessment: not_assessed | evaluated | limited`, velocidades de origem e estenose com `physicianConfirmed` (`packages/shared/src/clinicalModels/dopplerArterialMmii.ts:36-47`; `packages/shared/src/clinicalModels/dopplerFistulaAv.ts:31-40`), com pendência de cobertura quando nenhum segmento foi avaliado (`dopplerArterialMmii.ts:110`). O contrato mesentérico deve seguir esse padrão, não o núcleo portal.

## Etapa 0 — inventário, sem alterar nada

- Vasos oferecidos: tronco celíaco, artéria mesentérica superior, artéria mesentérica inferior, aorta de referência, artérias hepática e esplênica; veias mesentéricas, se houver no mesmo modelo.
- Se há “não avaliado” ou “não visualizado” por vaso, e se a AMI é opcional.
- Fases: jejum, pós-prandial, inspiração/expiração; se a variação respiratória do tronco celíaco é um controle próprio.
- Campos numéricos (VPS, VDF, IR, razão com a aorta) com unidade; se existem campos derivados.
- Morfologia: placa, dissecção, aneurisma visceral, variação anatômica (origem comum, artéria hepática substituta).
- Preparo e qualidade: jejum, gases, biotipo; se a limitação aparece no corpo e na conclusão.
- Conclusão, recomendações e se exigem confirmação. Registrar que critérios existem e onde, sem copiar valores.

## Cenários sintéticos (máximo 3)

### C1 — Normal (estado inicial)

Registrar quais vasos o texto declara normais sem medida; se AMI e variação respiratória entram por padrão; se a conclusão é ausência de achado ou exclusão de isquemia.

### C2 — Estenose da artéria mesentérica superior

Entrada: VPS sintética elevada apenas na AMS, demais vasos intactos. Registrar se a graduação é automática por limiar, se exige VDF ou confirmação, se a conclusão muda sozinha, se aparece hipótese de isquemia e se a aorta de referência é necessária. Fronteira opcional: apagar a velocidade e verificar se texto, grau ou recomendação persistem.

### C3 — Limitação por preparo ou gases

Entrada: tronco celíaco e AMS avaliados; AMI não visualizada por gases, ou jejum não confirmado. Registrar se a normalidade continua global, se a conclusão restringe o escopo e se a AMI não avaliada aparece como normal.

Se a interface tiver variação respiratória, substituir C3 por “aceleração do tronco celíaco só em expiração”, para verificar se o modelo sugere compressão extrínseca automaticamente.

## Riscos de falsa normalidade e de inferência

1. Normalidade de AMI ou de vaso não visualizado por padrão.
2. Conclusão como exclusão de isquemia mesentérica em exame limitado ou sem fase pós-prandial.
3. Graduação de estenose apenas por preset, sem velocidade registrada.
4. Diagnóstico de compressão do ligamento arqueado por um único marcador respiratório.
5. Velocidades em escala ou unidade incompatível; razão calculada sem aorta medida.
6. Persistência de grau ou recomendação após remover a velocidade.

## Para o crosswalk

- Código canônico proposto: `DOPPLER_MESENTERICO` (nome a confirmar). Categoria própria; não variante de `ABDOMEN_TOTAL_DOPPLER` nem de `DOPPLER_HEPATICO`.
- Avaliar um bloqueio em `ABDOMEN_TOTAL_DOPPLER` para que conteúdo arterial mesentérico ditado ali gere pendência, e não um abdome normal com núcleo portal.

## Melhorias sugeridas ao LaudoUSG

Todas corrigem um `gap confirmado` por busca e dependem de fonte clínica própria e revisão médica antes de qualquer limiar.

| Controle ou dado | Efeito no corpo e na conclusão | Condições e salvaguardas | Web e prompt mobile | Prioridade |
| --- | --- | --- | --- | --- |
| Vaso (TC, AMS, AMI) com `não avaliado / avaliado / limitado` | corpo descreve só vasos avaliados; conclusão restringe o escopo | AMI não avaliada nunca vira normal; pendência se nenhum vaso avaliado | linha por vaso com estado; prompt pede vaso por vaso | alta |
| Fase do exame (jejum, pós-prandial) e jejum confirmado | técnica registra as fases; conclusão sem exclusão de isquemia se só jejum | preparo não confirmado vira limitação visível | seletor de fase e checkbox de jejum; prompt pergunta preparo | alta |
| VPS, VDF e aorta de referência em cm/s | corpo traz medidas; razão derivada só com aorta medida | unidade fixa; derivado mostra origem | campos numéricos por vaso; prompt lê números com unidade | alta |
| Estenose com `physicianConfirmed` | conclusão só gradua com velocidade registrada e confirmação | sem confirmação, achado medido aparece descritivo | alerta de faixa, sem reclassificar sozinho | alta |
| Variação respiratória do TC (inspiração/expiração) | corpo descreve as duas medidas | compressão extrínseca só com confirmação médica | par de campos opcional | média |
| Variantes anatômicas e achados (placa, dissecção, aneurisma visceral) | corpo e conclusão quando informados | nada preselecionado | lista opcional; prompt não presume | média |
| Pendência em `ABDOMEN_TOTAL_DOPPLER` para termos arteriais mesentéricos | evita abdome normal com achado sem campo | não reencaminha sozinho; pede ao médico | aviso no formulário; prompt sinaliza | média |

O que falta validar: comportamento real do concorrente nos três cenários, fontes de critérios (VPS/VDF por fase) e aprovação médica do escopo mínimo.

## Atualização — 05/10/2026, após 2a6ac46 (DOPPLER_MESENTERICO)

A `main` (`01155d0`) passou a ter um MVP Web estruturado desta categoria, commit 2a6ac46 (DOPPLER_MESENTERICO), no grupo Vascular (`apps/web/src/components/laudar/categoryGroups.ts:55`) e em `STRUCTURED_WEB_CATEGORY_CODES` (`apps/web/src/lib/writerCategories.ts:12`). A classificação **Web: ausente** acima vale só para a base anterior. A prova por execução do MVP, o estado em Android/RN e iOS e o cumprimento dos requisitos deste preflight estão em `audits/lote2/`.
