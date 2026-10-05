# Lote 2 — Doppler de artérias temporais (`DOPPLER_ARTERIAS_TEMPORAIS`)

- Data: 05/10/2026. Base: `01155d0` (main = worktree), que inclui o MVP Web do commit b36391f (mesma mensagem de 8a21579). Somente leitura e execução local.
- Laudário: **não observado** (sem navegador). Só a existência no catálogo (`catalogo-ultrassonografia-2026-10-02.json:15`, grupo `vascular_arterial`).
- **Mudança registrada:** o preflight `audits/preflight-doppler-arterias-temporais-2026-10-03.md` (inclusive a reconferência das 05/10, que ainda dizia "ausente") classificava a Web como ausente. Desde b36391f a Web tem **MVP estruturado ativo**. O próprio preflight já tem a nota "Atualização — após b36391f" apontando para este arquivo. Android/RN, iOS, API de ditado, seed e conhecimento continuam **ausentes**.
- Prova: `audits/probes/probe-temporais-2026-10-05.ts` (rodar de `apps/api`: `npx tsx <arquivo> [OBJETIVO]`). Estado montado com `initialExamState` real → `adaptarDopplerArteriasTemporais` → `renderDopplerArteriasTemporaisWeb`, a mesma função que `/api/catalog/[category]/render` chama via `structuredRendererFor` (`apps/api/src/app/api/catalog/[category]/render/route.ts:66-76`).

## 1. Estado por plataforma

| Camada | Classificação | Evidência |
| --- | --- | --- |
| Web | **estruturado ativo** (MVP, contrato compartilhado, fail-closed) | formulário `apps/web/src/lib/deterministic/organs/dopplerArteriasTemporais.ts:9-53`; adaptador `apps/web/src/lib/catalog/dopplerArteriasTemporaisParaCatalogo.ts:18-77`, chamado em `LaudarWebExperience.tsx:603-604`; `writerCategories.ts:12`; `migradas.ts:51`; grupo Vascular `categoryGroups.ts:55`, aliases `:112`; renderer `apps/api/src/server/catalog-api/structuredRenderers.ts:21` → `renderer/categories/dopplerArterialFistulaWeb.ts:36-37` |
| Shared | **estruturado** (fora de `ClinicalModelCodeSchema`) | `packages/shared/src/clinicalModels/dopplerArteriasTemporais.ts` (schema `:20-41`, validação `:64-103`, render `:111-175`), versão `web-v1`, "pendente de revisão clínica" (`:4`) |
| Android/RN | **ausente** | nenhuma ocorrência de `temporais` em `apps/mobile/src` e `apps/mobile/app` (só textos legais sem relação) |
| iOS | **ausente** | nenhuma ocorrência em `laudousg-swift/LaudoUSG/LaudoUSG/` |
| API — ditado | **ausente** | sem regra em `pipeline/categoryNormalization.ts`; execução: `normalizeCategoryCode("DOPPLER_ARTERIAS_TEMPORAIS", seed, …)` devolve o código sem normalizar, e o seed não tem a categoria (`packages/db/src/seeds/data.ts:58-128`) |
| Banco / migrações | **ausente** | sem seed e sem migração com o código. O efeito no histórico Web não foi verificado |
| Conhecimento | **ausente** | sem `packages/knowledge/snippets/DOPPLER_ARTERIAS_TEMPORAIS` |
| Testes | parcial | `apps/web/tests/dopplerArteriasTemporaisStructured.manual.ts`; `apps/api/src/server/catalog-api/doppler-arterias-temporais-structured.manual.ts` |

## 2. Inventário do formulário Web

Topo: **Modelo de partida** (Em branco / Normal), padrão **Em branco** (`dopplerArterialMmii.ts:14-17`); **Lateralidade** (Bilateral / Direita / Esquerda), padrão **Bilateral**. Seções do lado fora do exame são ocultadas (`dopplerArteriasTemporais.ts:48-52`).

| Campo (por lado × tronco comum / frontal / parietal) | Opções | Padrão |
| --- | --- | --- |
| Avaliação | Conforme modelo / Não avaliado / Avaliado / Avaliação limitada | Conforme modelo |
| Fluxo | Conforme modelo / Detectável / Não detectado / Não informado | Conforme modelo |
| Halo parietal | Conforme modelo / Ausente / Presente / Indeterminado / Não pesquisado | Conforme modelo |
| Sinal de compressão | Não testado / Negativo / Positivo | Não testado |
| Espessura parietal (mm); VPS (cm/s); limitação (texto) | livre | vazio |
| Contexto: corticoide (Não informado/Não/Sim), dias; hipótese de arterite (Não incluir/Incluir); confirmação médica (Pendente/Confirmada) | — | Não informado; Não incluir; Pendente |

"Conforme modelo" com modelo Normal vira avaliado + fluxo detectável + halo ausente. Com modelo Em branco, vira não avaliado (`dopplerArteriasTemporaisParaCatalogo.ts:20-26`).

## 3. Provas por execução (estilo clássico; o objetivo foi conferido em T2)

| # | Controle e estado | Corpo (resumo) | Conclusão (resumo) | Pendência | Veredito |
| --- | --- | --- | --- | --- | --- |
| T1 | estado inicial (Em branco, Bilateral) | — | — | COVERAGE_REQUIRED D e E, **bloqueia**; render recusado | `observado no LaudoUSG`: nada normal sem dado |
| T1b | só "Modelo: Normal" | "Fluxo detectável, sem halo parietal, em: tronco comum, ramo frontal e ramo parietal", D e E | "Sem alterações ecográficas nos segmentos avaliados" D e E | nenhuma | `observado`: normal só por escolha explícita; a conclusão restringe ao avaliado e não exclui arterite |
| T2 | Normal + halo presente no frontal D, sem espessura, compressão ou confirmação | frontal D: "fluxo detectável, halo hipoecogênico parietal"; demais ramos D e o lado E inalterados | "Halo… no ramo frontal da artéria temporal superficial direita" + D restrito a tronco e parietal + E sem alterações | nenhuma | `observado`: lateralidade e ramo corretos; nenhuma hipótese diagnóstica |
| T2b | T2 + hipótese "Incluir", sem confirmação | — | — | HYPOTHESIS_DATA_INSUFFICIENT + CONFIRMATION_REQUIRED, bloqueia | `observado`: barreira dupla |
| T2c | T2 + hipótese confirmada, sem 2º marcador | — | — | DATA_INSUFFICIENT, bloqueia | `observado` |
| T2d | halo + compressão positiva + espessura 0,9 mm + confirmada | descreve os três achados | halo + compressão no frontal D; linha "compatíveis com arterite… conforme avaliação médica; correlacionar…" | nenhuma | `observado` |
| T3a | Normal bilateral, lado E inteiro "Não avaliado" | — | — | COVERAGE_REQUIRED (E), bloqueia | `observado`: obriga a ajustar a lateralidade |
| T3b | Lateralidade "Direita" | só o lado D; título singular | só D | nenhuma | `observado` |
| T3c | E só com o frontal avaliado | E: "em: ramo frontal" | E sem alterações (ramo frontal) + "Avaliação incompleta… tronco comum e ramo parietal" | nenhuma | `observado`: escopo restrito corretamente |
| T3d | Lateralidade "Direita" depois de preencher halo no frontal E | — | — | UNREQUESTED_SIDE_HAS_RESULTS, bloqueia | **defeito confirmado (P2)**: a pendência aponta para uma seção que a lateralidade escondeu, e não há ação visível para limpar |
| T3e | parietal E "limitada" sem descrição | — | — | LIMITATION_REQUIRED, bloqueia | `observado` |
| T7 | Normal + parietal E "limitada" com descrição | "Ramo parietal: avaliação limitada. …" **e** "Ramo parietal: fluxo detectável ao Doppler, sem halo parietal." | E incompleta (parietal) | nenhuma | **defeito confirmado (P1)**: num ramo marcado como limitado, fluxo e "sem halo" vêm do preset sem o médico informar. O ramo também aparece em duas linhas |
| T4 | remoção: halo volta para "Conforme modelo" | idêntico a T1b | idêntico a T1b | nenhuma | `observado`: comparação byte a byte = **true** |
| T5a | espessura 6 mm | — | — | WALL_THICKNESS_SCALE, bloqueia | `observado` |
| T5b | fluxo não detectado + VPS 40 | — | — | NO_FLOW_CONFLICT, bloqueia | `observado` |
| T5c | halo indeterminado no tronco D | descreve "pesquisa… indeterminada" | lista o achado; D restrito a frontal e parietal | nenhuma | `observado`: não vira normal; também não é tratado como avaliação incompleta (decisão clínica pendente) |
| T5d | corticoide Sim, 14 dias | igual a T1b | acrescenta a ressalva de sensibilidade reduzida | nenhuma | `observado` |
| T6 | halo + espessura **0,2 mm** + hipótese confirmada | descreve halo e 0,2 mm | inclui "compatíveis com arterite" | nenhuma | **defeito confirmado (P1)**: qualquer espessura medida conta como 2º marcador (`dopplerArteriasTemporais.ts:61-62`), inclusive um valor que o próprio placeholder sugere ser habitual |
| T6b | ramo **limitado** com halo + espessura + hipótese confirmada | limitação + achados | "Avaliação incompleta" e hipótese no mesmo ramo | nenhuma | candidato a lacuna (P2): decidir se o ramo limitado pode sustentar a hipótese |

## 4. Lacunas concretas

| # | Lacuna | Lado e dado mínimo | Rótulo | Prioridade |
| --- | --- | --- | --- | --- |
| L1 | Paridade: Android/RN, iOS e ditado não têm a categoria; o ditado "temporais" não normaliza e cai no `category_hint` ou em outra categoria | — | defeito confirmado (ausência por busca e execução) | P1 |
| L2 | Ramo "limitado" herda fluxo detectável e "sem halo" do modelo normal (T7) | por ramo e lado | defeito confirmado | P1 |
| L3 | 2º marcador da hipótese satisfeito por qualquer espessura medida (T6) | ramo; espessura acima de limiar a definir, ou marcação explícita de "parede espessada" | defeito confirmado; limiar = `candidato` (fonte provável: recomendação EULAR de imagem em vasculite de grandes vasos) | P1 |
| L4 | Sem artérias axilares e sem estenose ou aceleração focal por ramo | por lado | candidato a lacuna (escopo clínico a decidir) | P2 |
| L5 | Pendência em seção oculta após trocar a lateralidade (T3d) | lado excluído | defeito confirmado | P2 |
| L6 | Modelo normal afirma "sem halo" nos seis ramos com um clique; compressão não testada não aparece no texto | por ramo | inferido (preset explícito; risco de aceite sem conferência) | P2 |
| L7 | Sem seed, migração ou snippets; o histórico e as analytics da categoria não foram verificados | — | candidato a lacuna | P2 |
| L8 | Proteção cruzada: conteúdo de temporais ditado ou escrito em `DOPPLER_CAROTIDAS` (achados adicionais) termina com conclusão normal de carótidas (ver lote 2 de carótidas, C7) | — | defeito confirmado em carótidas | P1 |

## 5. Requisitos originais

### 5.1 Modelo normal

| Estrutura | Dado mínimo para "normal" | Intenção no corpo | Intenção na conclusão |
| --- | --- | --- | --- |
| Cada ramo (tronco, frontal, parietal) × lado | avaliado + fluxo detectável + halo pesquisado e ausente | ramos preservados agrupados numa linha por lado | ausência de alteração **nos segmentos avaliados**, sem excluir diagnóstico |
| Ramo limitado | descrição da limitação | só a limitação e o que foi efetivamente visto | avaliação incompleta, com o ramo nomeado |
| Escopo | lateralidade | título e técnica conforme o lado | conclusão só dos lados incluídos |

### 5.2 Biblioteca de alterações

| id | Dados mínimos | Corpo | Conclusão | Salvaguardas |
| --- | --- | --- | --- | --- |
| `halo_parietal` | lado, ramo, halo presente | halo no ramo | achado descritivo com ramo e lado | nunca diagnóstico isolado |
| `compressao_positiva` | lado, ramo | parede visível à compressão | soma ao halo do mesmo ramo | "não testado" nunca vira negativo |
| `parede_espessada` | lado, ramo, espessura em mm + marcação do médico | medida com unidade | entra como 2º marcador só se marcada | escala ≤ 3 mm já validada; limiar = candidato |
| `fluxo_ausente` | lado, ramo | fluxo não detectado | achado com ramo | sem VPS no mesmo ramo (já validado) |
| `hipotese_acg` | ≥1 ramo avaliado com halo + 2º marcador **qualificado** + confirmação médica | — | compatível, conforme avaliação médica, com correlação clínico-laboratorial | ramo limitado: decisão clínica; corticoide reduz sensibilidade |

### 5.3 Formulário Web

- Manter: modelo em branco por padrão, cobertura obrigatória por lado, bloqueios atuais, remoção limpa (T4).
- Mudar: em ramo "limitado", fluxo e halo deixam de herdar o modelo e passam a "não informado" até a escolha do médico. A espessura só conta como marcador quando o médico marca "parede espessada". Ao trocar a lateralidade com dados no lado excluído, oferecer limpar o lado ou reexibir a seção.
- Avisos: halo indeterminado sugere marcar o ramo como limitado; corticoide "não informado" com hipótese incluída gera um aviso.

### 5.4 Prompt mobile (extrator)

- Extrair: lado e ramo de cada achado; halo (presente, ausente, indeterminado, não pesquisado); compressão (positivo, negativo, não testado); espessura com unidade original; ramos não avaliados ou limitados e o motivo; corticoide e tempo.
- Nunca presumir: halo ausente por silêncio; compressão negativa; lado contralateral normal; hipótese de arterite sem pedido e confirmação explícitos do médico.

## 6. Perguntas para a rodada no concorrente (não observado)

1. O exame abre normal ou em branco? Separa ramos (tronco, frontal, parietal) e lados?
2. Há campos de halo, compressão e espessura? A espessura tem unidade e faixa?
3. Um ramo não avaliado ou limitado muda a conclusão?
4. A hipótese de arterite aparece sozinha a partir de algum achado ou exige ação do médico?
5. Inclui artérias axilares? Como remove um achado e restaura o texto?

## 7. Ordem de implementação sugerida

1. P1 — Ramo limitado sem herança do preset (T7), com teste.
2. P1 — Qualificar o 2º marcador (marcação explícita de parede espessada; limiar como candidato com fonte) (T6).
3. P1 — Guarda em carótidas: termos temporais em achados adicionais impedem a conclusão normal.
4. P1 — Paridade: seed e normalização do ditado; categoria e prompt extrator no RN e no iOS, consumindo o contrato `web-v1` do shared.
5. P2 — UX da lateralidade com dados ocultos (T3d); decidir halo indeterminado × incompleto; axilares e estenose focal após revisão clínica.
