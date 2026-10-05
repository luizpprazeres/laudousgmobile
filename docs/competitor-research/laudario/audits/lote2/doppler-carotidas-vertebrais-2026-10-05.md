# Lote 2 — Doppler de carótidas e vertebrais (`DOPPLER_CAROTIDAS`)

- Data: 05/10/2026. Base: `01155d0` (main = worktree). Somente leitura e execução local; nenhum código de produto alterado.
- Laudário: **não observado** (sem navegador). Só a existência no catálogo (`catalogo-ultrassonografia-2026-10-02.json:15`, grupo `vascular_arterial`).
- Preflight usado e não repetido: `audits/preflight-doppler-carotidas-vertebrais-2026-10-05.md`. Aqui, os riscos marcados como `inferido` lá viram prova por execução.
- Prova: `audits/probes/probe-carotidas-2026-10-05.ts` (rodar de `apps/api`: `npx tsx <arquivo> [OBJETIVO]`). O script monta o estado com o `initialState` real do formulário, passa pelo adaptador `adaptarDopplerCarotidas` e renderiza com `renderizarSelecao("DOPPLER_CAROTIDAS", estilo, [], dados)`. Esse é o mesmo caminho de `/api/catalog/[category]/render` para categorias migradas sem renderer estruturado.

## 1. Estado por plataforma

| Camada | Classificação | Evidência |
| --- | --- | --- |
| Web | **estruturado ativo** (renderer do catálogo) | formulário `apps/web/src/lib/deterministic/organs/dopplerCarotidas.ts:4-33`; painel `apps/web/src/components/laudar/DopplerCarotidasFormPanel.tsx:18-49`; adaptador `apps/web/src/lib/catalog/dopplerCarotidasParaCatalogo.ts:58-73`, chamado em `LaudarWebExperience.tsx:585-586`; grupo "Medicina interna", não Vascular (`categoryGroups.ts:29`) |
| Android/RN | **genérico** (ditado → writer) | `apps/mobile/src/ui/tokens.ts:146`; `features/generate/categories.manual.ts:8` |
| iOS | **genérico** (ditado → writer) | `Models/Category.swift:27`, `:98`, `:256` |
| API — ditado | **estruturado dormente** | renderer `apps/api/src/server/renderer/categories/DOPPLER_CAROTIDAS.ts`; `pipeline/renderer.ts:542`, `:851`; fora de `APPROVED_CLINICAL_RENDERERS` (`pipeline/generationPathResolver.ts:14-20`), depende de `RENDERER_CATEGORIES` (`:87`), vazio em produção em 03/10 |
| Shared | **ausente** | só rótulo (`packages/shared/src/categoryPresentation.ts:34`) |
| Conhecimento | **ausente** | sem `packages/knowledge/snippets/DOPPLER_CAROTIDAS`; sem contrato em `prompts/contracts/index.ts` |

## 2. Inventário do formulário Web (por lado, D e E idênticos)

| Campo | Opções | Padrão inicial |
| --- | --- | --- |
| EMI (mm) | número livre | vazio |
| ACC / ACI / ACE: PSV e VDF (cm/s) | número livre | vazio |
| Vertebral: PSV | número livre | vazio |
| Vertebral: direção | Anterógrado / Retrógrado / Ausente / Não informado | **Anterógrado** (`dopplerCarotidas.ts:9`) |
| Placas (0..n) | localização, composição, superfície, espessura, estenose informada (%), descrição | nenhuma |
| Conclusão: classificação | Normal / Ateromatose sem estenose / <50% / 50–69% / 70–99% / Oclusão / Não classificar | **Normal** (`dopplerCarotidas.ts:18`) |
| Conclusão: lado | Não se aplica / D / E / Bilateral | vazio |
| Conclusão livre; achados adicionais | texto | vazio |

Não existe estado "não avaliado" nem "limitado" por vaso, e não existe controle de lateralidade do exame.

## 3. Provas por execução (estilo clássico; o objetivo foi conferido em C1 e C3c)

| # | Controle e estado | Corpo (resumo) | Conclusão (resumo) | Pendência | Veredito |
| --- | --- | --- | --- | --- | --- |
| C1 | estado inicial, nada preenchido | técnica "avaliação bilateral"; EMI "aspecto habitual" D/E; "não se observam placas" D/E; vertebrais "fluxo anterógrado" D/E | "dentro dos limites da normalidade" | nenhuma | **defeito confirmado**: laudo normal completo sem nenhum dado. No objetivo saem "Sem placas" e "fluxo anterógrado" D/E |
| C2 | placa ACI D (estenose informada 70%, VPS 280/VDF 95), classificação mantida em "Normal" | placa e velocidades à direita corretas; lado E intacto | **"dentro dos limites da normalidade"** | nenhuma | **defeito confirmado (P0)**: o corpo descreve 70% de redução luminal e a conclusão diz normal |
| C2b | igual a C2 com "Não classificar" | igual | "Ateromatose carotídea. Grau de estenose não classificado neste formulário." | nenhuma | `observado no LaudoUSG`: sem lado na conclusão; a frase cita "formulário" dentro do laudo |
| C3 | vertebral E retrógrada (PSV 35), classificação "Normal" | "Artéria vertebral esquerda: fluxo retrógrado" | normal | nenhuma | **defeito confirmado (P0)** |
| C3b | vertebral E retrógrada, "Não classificar" | igual | **normal** (sem placas, o `default` volta ao normal, `DOPPLER_CAROTIDAS.ts:220-223`) | nenhuma | **defeito confirmado (P0)** |
| C3c | vertebral E "Não informado" | clássico: "A artéria vertebral esquerda apresenta fluxo anterógrado" (`:204`); objetivo: linha omitida | normal | nenhuma | **defeito confirmado (P1)**: "não informado" vira anterógrado no clássico |
| C4 | classificação 50–69% com lado vazio | placa ACI D | "Estenose carotídea de 50 a 69% ." | nenhuma | **defeito confirmado**: sem lado e com espaço antes do ponto final (`:215-218`) |
| C4b | "Oclusão" com lado vazio, sem nenhum achado no corpo | corpo normal D/E | "Oclusão carotídea ." | nenhuma | **defeito confirmado (P0)**: conclusão de oclusão sem vaso, sem lado e contradita pelo corpo |
| C5a | remover a placa (painel apaga `placas.<id>.*`), classificação 70–99% D mantida | "Não se observam placas ateromatosas à direita" + velocidades | "Estenose carotídea de 70 a 99% à direita." | nenhuma | **defeito confirmado (P1)**: a remoção deixa conclusão órfã. A classificação não depende do achado |
| C5b | remover placa e voltar a classificação para "Normal" | sem placa; VPS/VDF residuais permanecem | normal | nenhuma | `observado no LaudoUSG`: a remoção limpa a placa. As velocidades ficam porque são campos independentes (esperado) |
| C6 | EMI "8" à direita; ACC E com VPS 60 e VDF 80 | "mede 8 mm"; ACC E sem IR | normal | **bloqueante** só para VDF > VPS | `observado no LaudoUSG`: VDF > VPS bloqueia (a Web bloqueia por pendência, `LaudarWebExperience.tsx:891`). EMI de 8 mm passa sem aviso: **defeito confirmado (P1)** |
| C7 | achados adicionais "vertebral direita sem fluxo detectável", classificação "Normal" | corpo afirma vertebral D anterógrada **e**, abaixo, sem fluxo | normal | nenhuma | **defeito confirmado (P0)**: contradição interna. O texto livre não entra na conclusão (`:241`) |

## 4. Lacunas concretas

| # | Lacuna | Lado e dado mínimo | Rótulo | Prioridade |
| --- | --- | --- | --- | --- |
| L1 | Conclusão "normal" com placa, estenose informada, vertebral retrógrada ou ausente, ou achado adicional (C2, C3, C3b, C7) | qualquer lado | defeito confirmado | P0 |
| L2 | Classificação sem lado e sem vaso gera conclusão (C4, C4b); oclusão sem nenhum achado no corpo | lado + vaso (ACC/ACI) obrigatórios para toda classe ≠ normal | defeito confirmado | P0 |
| L3 | Estado inicial já normal: classificação "Normal" e vertebral "Anterógrado" pré-marcadas; EMI e placas afirmadas sem dado (C1, C3c) | por vaso e lado | defeito confirmado | P0 |
| L4 | Sem "não avaliado" ou "limitado" por vaso; técnica fixa "avaliação bilateral" | por vaso e lado | candidato a lacuna | P1 |
| L5 | Remoção de achado não invalida a classificação dependente (C5a) | lado da classificação × achados do lado | defeito confirmado | P1 |
| L6 | Plausibilidade e unidade: EMI 8 mm aceita; nenhuma faixa para VPS e espessura de placa | por campo | defeito confirmado (EMI); faixas = candidato | P1 |
| L7 | Uma classificação para o exame inteiro; graus diferentes por lado são impossíveis | D e E separados | candidato a lacuna | P1 |
| L8 | Mobile/iOS vão ao writer genérico, sem contrato nem snippets. O mesmo caso pode gerar conclusões diferentes por plataforma | — | inferido (writer não executado) | P1 |
| L9 | Texto: "lipidica" sem acento; "PSV" no corpo e no rótulo; "neste formulário" no laudo | — | defeito confirmado | P2 |
| L10 | Categoria fora do grupo Vascular no seletor Web | — | observado no LaudoUSG | P2 |

## 5. Requisitos originais

### 5.1 Modelo normal

| Estrutura | Dado mínimo para "normal" | Intenção no corpo | Intenção na conclusão |
| --- | --- | --- | --- |
| Complexo médio-intimal (por lado) | EMI medida ou "avaliado sem espessamento" marcado | espessura com unidade, ou aspecto preservado só se marcado | não citar isoladamente |
| Placas (por lado) | "pesquisa de placas: negativa" marcada | ausência de placas no lado avaliado | compõe a normalidade do lado |
| ACC, ACI e ACE (por lado) | estado "avaliado" + fluxo de padrão preservado | velocidades quando medidas | sem estenose no lado, só se a ACI foi avaliada |
| Vertebral (por lado) | direção escolhida explicitamente | sentido do fluxo | normal só com anterógrado explícito |
| Escopo | lateralidade e vasos avaliados | técnica lista o que foi avaliado | conclusão restrita ao escopo avaliado |

### 5.2 Biblioteca de alterações

| id | Dados mínimos | Corpo | Conclusão | Salvaguardas |
| --- | --- | --- | --- | --- |
| `placa_sem_estenose_significativa` | lado, vaso/segmento | placa com características informadas | ateromatose no lado, sem estenose significativa | só com classe escolhida pelo médico |
| `estenose_graduada` | lado, vaso (ACI/ACC), classe | placa e velocidades do vaso | estenose de faixa X no vaso e lado | classe nunca derivada; critério = `candidato` com fonte a definir (consenso de sociedade) |
| `oclusao` | lado, vaso, ausência de fluxo no vaso | ausência de fluxo no segmento | oclusão do vaso no lado | exige dado no corpo do mesmo vaso |
| `vertebral_fluxo_invertido` | lado, direção (retrógrado/alternante) | sentido do fluxo | inversão de fluxo vertebral no lado | hipótese de roubo da subclávia só com confirmação médica |
| `vertebral_sem_fluxo` | lado, distinção entre "não visualizada" e "sem fluxo" | conforme a escolha | sem fluxo → achado; não visualizada → limitação | nunca afirmar oclusão por não visualização |
| `emi_aumentada` | lado, valor em mm | medida | só se o médico marcar como achado | faixa plausível; limiar = `candidato` |

### 5.3 Formulário Web

- Seções: Escopo (lateralidade, vasos avaliados) → Lado D → Lado E (estado por vaso: não avaliado / avaliado / limitado + medidas) → Placas por lado → Conclusão por lado (classe + vaso).
- Padrões: classificação e direção vertebral começam vazias. "Modelo normal" só por escolha explícita (como já fazem temporais e MMII).
- Pendências bloqueantes: classe ≠ normal sem lado ou vaso; classe "normal" com placa com estenose informada, vertebral retrógrada ou ausente, ou achado adicional; oclusão sem ausência de fluxo descrita no vaso; VDF > VPS (já existe).
- Avisos (não bloqueiam): EMI ou espessura fora da faixa plausível (provável cm/mm); estenose informada sem classe; texto de achados adicionais não refletido na conclusão.

### 5.4 Prompt mobile (extrator)

- Extrair: lado e vaso de cada medida; direção vertebral literal; placas com lado e segmento; classe e lado só se ditos; vasos não avaliados ou limitados; unidade original.
- Nunca presumir: anterógrado por silêncio; normalidade de vaso não citado; lado da classificação; grau a partir de velocidades; oclusão a partir de "não visualizada".

## 6. Perguntas para a rodada no concorrente (não observado)

1. O exame abre com conclusão normal e vertebrais anterógradas já marcadas?
2. Ao inserir placa com redução luminal, a conclusão muda sozinha ou exige classe?
3. A classe é por lado e por vaso? Há razão ACI/ACC calculada?
4. Existe "não avaliado" ou "limitado" por vaso, e isso altera técnica e conclusão?
5. Vertebral: há fluxo alternante e distinção entre ausente e não visualizada? Remover um achado restaura o texto inteiro?

## 7. Ordem de implementação sugerida

1. P0 — Guarda de coerência no adaptador Web: bloquear "Normal" com placa, estenose, vertebral alterada ou achado adicional; bloquear classe sem lado ou vaso (cobre C2, C3, C4, C4b, C7).
2. P0 — Estado inicial em branco: classificação e direção vertebral vazias; "modelo normal" explícito (cobre C1, C3c).
3. P1 — Invalidar a classe quando o achado que a sustenta é removido (C5a); aviso de unidade da EMI (C6).
4. P1 — Estado por vaso e lado + técnica conforme o escopo; classe por lado e vaso.
5. P1 — Contrato compartilhado em `packages/shared` e prompt mobile; só então avaliar ligar o renderer no ditado.
6. P2 — Texto (acento, sigla VPS, frase "neste formulário") e mover para o grupo Vascular.
