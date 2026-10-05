# Doppler de artérias mesentéricas (`DOPPLER_MESENTERICO`) — lote 2

- Data: 05/10/2026. Base: `01155d0` (main = worktree). MVP Web do commit `2a6ac46`.
- Laudário: **não observado** (sem navegador); só existência no catálogo (`catalogo-ultrassonografia-2026-10-02.json`, linha 17, grupo `vascular_abdominal`).
- Prova: `audits/probes/probe-mesenterico-2026-10-05.ts` (dados sintéticos; executado a partir da main com `npx tsx`).
- Mudança desde o preflight (`audits/preflight-doppler-arterias-mesentericas-2026-10-05.md`): a camada Web passou de **ausente** para **estruturado ativo (composição local)**. As demais camadas continuam ausentes.

## 1. Estado por plataforma

| Camada | Classificação | Evidência |
| --- | --- | --- |
| Web | **estruturado ativo, composição local** (não migrada; não passa pelo renderer canônico) | `apps/web/src/lib/deterministic/organs/dopplerMesenterico.ts:1-264`; registro `deterministic/index.ts:35,91`; grupo Vascular `components/laudar/categoryGroups.ts:55`; busca `categoryGroups.ts:111`; `writerCategories.ts:12` (estruturada, não writer); pendência de exame `organs/pendenciasLocais.ts:23`; teste `apps/web/tests/dopplerMesentericoStructured.manual.ts` |
| Shared | **parcial**: só o rótulo | `packages/shared/src/categoryPresentation.ts:41`; sem contrato em `clinicalModels/contracts.ts` (o MVP compõe no módulo Web, não no shared) |
| Android/RN | **ausente** | `apps/mobile/src/features/generate/categories.manual.ts:5-17` e `apps/mobile/src/ui/tokens.ts` sem o código; únicas ocorrências mesentéricas são a **veia** do Doppler hepático (`apps/mobile/src/features/generate/clinicalModels.ts:38,45`) |
| iOS | **ausente** | `laudousg-swift/.../Models/Category.swift:3-44` sem caso; só `superiorMesentericVein` do hepático (`Features/ClinicalModels/ClinicalModelWorkspace.swift:250`) |
| API ditado | **ausente** | sem `renderer/categories/DOPPLER_MESENTERICO.ts`, sem prompt/contrato; código fora do seed (`packages/db/src/seeds/data.ts`) e das migrations |
| Conhecimento | **ausente** | sem `packages/knowledge/snippets/DOPPLER_MESENTERICO/` |

**Roteamento do ditado (`observado no LaudoUSG`, probe):** com os códigos do seed, `DOPPLER_MESENTERICO` não é conhecido. Resultado de `normalizeCategoryCode` para o texto "Doppler das artérias mesentéricas…":
- `DOPPLER_ABDOMINAL_MESENTERICO` → `ABDOMEN_TOTAL_DOPPLER` (família `/abdom/`, `categoryNormalization.ts:75`). **Confirmado: um código com "ABDOM" leva o ditado mesentérico ao abdome com Doppler**, cujo núcleo é portal/venoso.
- `DOPPLER_MESENTERICO` ou `DOPPLER_ARTERIAS_MESENTERICAS` → volta não normalizado (validator rejeita) ou, com `category_hint=ABDOMEN_TOTAL`, vira `ABDOMEN_TOTAL` (sem Doppler).
Nenhum destino tem campo para TC/AMS/AMI. O bloqueio sugerido no preflight (pendência em `ABDOMEN_TOTAL_DOPPLER` para termos arteriais mesentéricos) **não foi implementado**.

## 2. Inventário de controles (Web)

| Controle | Opções | Padrão |
| --- | --- | --- |
| Modelo de partida | Em branco / Normal (TC e AMS avaliados) | Em branco |
| Jejum | Não informado / Confirmado / Não confirmado | Não informado (pendência bloqueante) |
| Fases | Jejum / Jejum e pós-prandial | Jejum |
| Aorta de referência | VPS (cm/s, opcional) | vazio |
| TC, AMS, AMI — Avaliação | Conforme modelo / Não avaliado / Avaliado / Limitada | Conforme modelo (AMI fica não avaliada mesmo no modelo normal) |
| — Limitação | texto (obrigatório se limitada) | vazio |
| — VPS, VDF | cm/s | vazio |
| — Placas | Não informado / Ausentes / Presentes | Não informado |
| — Alteração | Nenhuma / Aceleração focal (VPS e VDF na lesão + confirmação) / Fluxo não detectado (confirmação de oclusão) | Nenhuma |
| TC — respiratório | VPS inspiração, VPS expiração, confirmação de ligamento arqueado | vazio / Pendente |

## 3. Provas (sintéticas)

| # | Controle e estado | Corpo (resumo) | Conclusão (resumo) | Pendência | Veredito |
| --- | --- | --- | --- | --- | --- |
| M1 | inicial intocado | — | — | Preparo (jejum) + exame (nenhum vaso) | `observado no LaudoUSG`: nada normal sem dado |
| M1b | em branco + jejum confirmado | três vasos "não avaliado(a)" | os três "não avaliado(a)" | só a de exame (`pendenciasLocais`); o compositor devolve texto | `observado`: bloqueio depende da UI somar a pendência de exame (`LaudarWebExperience.tsx:624-628`, `inferido` que bloqueia) |
| M1c | modelo normal | TC e AMS pérvios "padrão habitual", **sem VPS**; AMI não avaliada | TC/AMS "sem sinais de estenose hemodinamicamente significativa"; AMI não avaliada; sem "exclui isquemia" | nenhuma | `candidato a lacuna`: normalidade de TC/AMS sem nenhuma velocidade |
| M2 | AMS aceleração focal VPS 320, sem confirmação; aorta 95 | AMS com aceleração focal, VPS 320; aorta descrita | "aumento focal da VPS … sem estenose confirmada"; TC intacto | nenhuma | `observado`: descritivo sem confirmação, sem graduação por limiar |
| M2b | idem + fase pós-prandial | **idêntico a M2** salvo a técnica | idêntica | nenhuma | `defeito confirmado`: fase pós-prandial só muda a técnica; não há campo de VPS pós-prandial |
| M3 | AMI limitada (interposição gasosa); jejum não confirmado | AMI "com fluxo detectável nos segmentos visualizados" + limitação; técnica "em jejum. Jejum não confirmado…" | "Avaliação limitada da AMI (interposição gasosa)" | nenhuma | `defeito confirmado`: limitada afirma fluxo detectável sem dado; técnica diz "em jejum" e "jejum não confirmado" na mesma frase |
| M3c | AMI **não avaliada** com motivo "interposição gasosa" | — | — | "há dados preenchidos em vaso não avaliado" | `defeito confirmado`: não há como registrar "não visualizada por gases" sem afirmar fluxo |
| M4 | M2 e depois Alteração = Nenhuma (subcampos ficam) | AMS volta a "pérvia, padrão habitual" | AMS pérvia | nenhuma | `observado`: sem resíduo de texto de estenose |
| M5 | estenose **confirmada** com VPS da lesão 90 < VPS basal 250 | aceleração focal VPS 90 | "estenose hemodinamicamente significativa (VPS 90 cm/s)" | nenhuma | `candidato a lacuna`: sem aviso de incoerência |
| M6/M6b | VPS "1,4 m/s" / VPS "1,4" | M6 bloqueia; M6b: AMS "pérvia … (VPS de 1,4 cm/s)" | M6b: AMS "sem sinais de estenose" | M6 sim; M6b nenhuma | `defeito confirmado` (M6b): velocidade fora de escala aceita e dita normal |

## 4. Requisitos do preflight — cumprimento

| Requisito do preflight | Situação |
| --- | --- |
| Estado por vaso TC/AMS/AMI, AMI nunca normal por padrão | **atendido** (M1c) |
| Pendência se nenhum vaso avaliado | **atendido**, mas só no nível de exame (M1b) |
| Fase jejum/pós-prandial na técnica | **atendido parcialmente**: a técnica registra; não há medidas por fase (M2b) |
| Jejum confirmado; preparo não confirmado como limitação visível | **parcial**: aparece na técnica, não na conclusão; frase contraditória (M3) |
| VPS/VDF em cm/s; aorta de referência só quando medida | **atendido**; razão com a aorta fora do MVP (declarado no módulo) |
| Estenose só com velocidade + confirmação | **atendido** (M2; teste "sem VPS bloqueia") |
| Variação respiratória do TC; ligamento arqueado só com as duas fases + confirmação | **atendido** (teste do módulo) |
| Variantes anatômicas, dissecção, aneurisma visceral | **não atendido** |
| Pendência em `ABDOMEN_TOTAL_DOPPLER` para termos mesentéricos arteriais | **não atendido** |
| Paridade mobile/iOS e prompt de extração | **não atendido** |

## 5. Lacunas concretas

1. **P0 — ditado mesentérico cai no abdome com Doppler** (`defeito confirmado` por probe): código com "ABDOM" → `ABDOMEN_TOTAL_DOPPLER`, que afirma abdome normal e não tem TC/AMS/AMI. Mínimo: pendência/aviso no abdome com Doppler quando o texto cita tronco celíaco, AMS ou AMI arterial.
2. **P1 — "limitada" afirma fluxo detectável** e "não avaliada" não aceita motivo (M3, M3c). Mínimo: estado "não visualizado" com motivo, sem frase de fluxo.
3. **P1 — sem faixa plausível de velocidade** (M6b): "1,4" vira 1,4 cm/s e o vaso é dito normal. Mínimo: aviso bloqueante abaixo/acima de faixa técnica a definir (`candidato`, sem limiar clínico).
4. **P1 — fase pós-prandial sem dado** (M2b): conclusão não diferencia exame só em jejum. Mínimo: VPS/VDF pós-prandial por vaso quando a fase for marcada; senão, pendência.
5. **P1 — normalidade sem nenhuma medida no modelo normal** (M1c): "sem sinais de estenose" sem VPS registrada. Mínimo: aviso (não bloqueio) ou exigir VPS em TC e AMS para a frase de ausência de estenose.
6. **P2 — técnica contraditória** com jejum não confirmado (M3); limitação de preparo ausente da conclusão.
7. **P2 — estenose confirmada com VPS da lesão ≤ basal** sem aviso (M5).
8. **P2 — paridade**: Android/RN, iOS, API ditado, shared e conhecimento ausentes; o MVP Web compõe só no navegador (sem contrato compartilhado reutilizável pelo mobile).

## 6. Requisitos originais

**Modelo normal**
| Estrutura | Dado mínimo para "normal" | Intenção no corpo | Intenção na conclusão |
| --- | --- | --- | --- |
| Tronco celíaco | avaliado + VPS registrada | vaso pérvio, fluxo de padrão esperado, com a VPS | vaso pérvio, sem aceleração focal documentada |
| AMS | avaliada + VPS (VDF desejável) | idem | idem |
| AMI | avaliada explicitamente | idem; senão "não avaliada/não visualizada" com motivo | só entra como normal se avaliada |
| Preparo/fases | jejum informado; fases marcadas | técnica com fases realizadas | se só jejum ou jejum não confirmado, limitar o escopo |

**Biblioteca de alterações**
| id | Dados mínimos | Corpo | Conclusão | Salvaguardas |
| --- | --- | --- | --- | --- |
| `aceleracao_focal` | vaso, VPS na lesão | aceleração focal com VPS/VDF | aumento focal de velocidade, sem graduação | sem confirmação não diz "estenose"; aviso se VPS lesão ≤ basal |
| `estenose_confirmada` | acima + confirmação médica | idem | estenose significativa do vaso | sem limiar automático |
| `fluxo_nao_detectado` | vaso avaliado sem limitação | ausência de fluxo colorido e espectral | oclusão só com confirmação | bloqueia se limitada |
| `nao_visualizado` | motivo | vaso não visualizado (motivo) | escopo restrito | nunca afirma fluxo |
| `variacao_respiratoria_tc` | VPS inspiração e expiração | as duas medidas | compressão extrínseca só com confirmação | um único marcador não basta |
| `placa`, `dissecao`, `aneurisma_visceral`, `variante_anatomica` | vaso + descrição; medida quando aneurisma | descrição observada | conforme achado | nada pré-marcado |

**Formulário Web:** seções Preparo → Aorta → TC → AMS → AMI → Achados adicionais. Nada normal sem dado mínimo; pendência bloqueante para: jejum não informado, nenhum vaso avaliado, velocidade fora de faixa técnica, fase pós-prandial sem medida, limitada sem motivo. Avisos: VPS lesão ≤ basal, modelo normal sem VPS.

**Prompt mobile (extrator):** extrair vaso a vaso (estado, VPS/VDF com unidade, fase, inspiração/expiração, placa, alteração, confirmação dita pelo médico), jejum e limitações. Nunca presumir AMI avaliada, fase pós-prandial, confirmação de estenose/oclusão, ligamento arqueado, nem converter m/s sem a unidade dita.

## 7. Perguntas para a rodada no concorrente
- Quais vasos o modelo oferece e se a AMI e a aorta de referência são opcionais.
- Se há fase pós-prandial com campos próprios e como a conclusão muda sem ela.
- Se a estenose é graduada por limiar automático e se exige confirmação.
- Como trata vaso não visualizado (gases) e jejum não confirmado no corpo e na conclusão.
- Se há variação respiratória do TC e se o texto sugere compressão extrínseca sozinho.
- Se apagar a velocidade remove grau, conclusão e recomendação.

## 8. Ordem sugerida
1. P0: aviso em `ABDOMEN_TOTAL_DOPPLER` para termos arteriais mesentéricos; registrar o código no seed antes de qualquer ditado.
2. P1: estado "não visualizado" com motivo; corrigir frase da "limitada".
3. P1: faixa técnica de velocidade (bloqueio) e medidas por fase pós-prandial.
4. P1: exigir VPS para "sem sinais de estenose" no modelo normal.
5. P2: técnica coerente com jejum não confirmado; aviso VPS lesão ≤ basal; achados adicionais.
6. P2: mover a regra para contrato em `packages/shared` e então paridade RN/iOS/API.
