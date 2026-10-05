# Aparelho urinário (`VIAS_URINARIAS`) — lote 2

- Data: 05/10/2026. Base: `01155d0` (main = worktree).
- Laudário: **não observado** (sem navegador); só existência no catálogo (`catalogo-ultrassonografia-2026-10-02.json`, linha 8: "Aparelho Urinário" e "Aparelho Urinário com Doppler"; linha 23: combinados com bolsa testicular e com próstata).
- Prova: `audits/probes/probe-vias-urinarias-2026-10-05.ts` (formulário Web → `adaptarViasUrinarias` → `renderizarSelecao("VIAS_URINARIAS", "CLASSICO_COMPLETO", [], dados)`; dados sintéticos).

## 1. Estado por plataforma

| Camada | Classificação | Evidência |
| --- | --- | --- |
| Web | **estruturado ativo, migrado** (renderer canônico) | formulário `apps/web/src/lib/deterministic/organs/viasUrinarias.ts:38-52` + módulos compartilhados `organs/urinaryShared.ts` (rim `:564-640`, bexiga `:84-245`); adaptador `apps/web/src/lib/catalog/viasUrinariasParaCatalogo.ts:35-83`; `catalog/migradas.ts` (31/08) |
| API ditado | **estruturado dormente** (renderer existe; caminho efetivo = writer) | `apps/api/src/server/renderer/categories/VIAS_URINARIAS.ts` (schema `:97-143`, prompt de extração `:248-307`); `generationPathResolver.ts:87` só liga por `RENDERER_CATEGORIES` (default vazio, `env.ts:74`; vazio em produção em 03/10) → `writer-pure` |
| Android/RN | **genérico (ditado)** | `apps/mobile/src/ui/tokens.ts:140`; sem formulário estruturado |
| iOS | **genérico (ditado)** | `laudousg-swift/.../Models/Category.swift:7` |
| Shared | **parcial** | contrato de bexiga/rim compartilhado vive no Web (`urinaryShared.ts`) e no schema da API; não há modelo em `packages/shared/src/clinicalModels` |
| Conhecimento | **ativo** (writer) | `packages/knowledge/snippets/VIAS_URINARIAS/` (modelo, 9 regras, 3 exceções); sem regra de nefrectomia/rim não visualizado |
| "Com Doppler" | **ausente como exame único** | ver §1.1 |

### 1.1 Fronteira com `DOPPLER_RENAL` (variante com Doppler)
- `DOPPLER_RENAL` Web (`organs/dopplerRenal.ts:141-152`) = aorta + **os mesmos módulos de rim** (`createSharedKidneyModule('DOPPLER_RENAL', …)`) + artérias renais. Não tem ureteres nem bexiga/resíduo.
- A associação de exames Web só tem `ABDOMEN_TOTAL + PROSTATA_SUPRAPUBICA` e `MAMARIA + PELVE_FEMININA` (`apps/web/src/lib/composition/associations.ts:37-60`). Não há `VIAS_URINARIAS + DOPPLER_RENAL` nem `VIAS_URINARIAS + PRÓSTATA`.
- Conclusão (`inferido` do código): **não compõe nem duplica código** — a morfologia renal é um contrato só; mas o médico escolhe entre perder bexiga/ureteres (Doppler renal) ou perder o Doppler (vias urinárias). Emitir os dois laudos **duplicaria o texto renal**. Roteamento do ditado: `categoryNormalization.ts:47` manda "urinári" para `VIAS_URINARIAS` antes de qualquer regra de Doppler.

## 2. Inventário de controles (Web)

| Seção / campo | Opções | Padrão inicial |
| --- | --- | --- |
| Rim D/E — Dimensões | Normais / Discretamente reduzidas / Reduzidas | **Normais** |
| — Diferenciação corticomedular | Preservada / Reduzida | **Preservada** |
| — Posição e estrutura | situação baixa, rotação, DRC | nenhum |
| — Dilatação pielocalicial | Ausente / Leve / Moderada / Acentuada | **Ausente** |
| — Litíase (cálculo) | dimensão; localização polo sup/terço médio/polo inf | localização **polo superior** pré-marcada |
| — Cistos; Outras alterações | simples (dim.), múltiplos; complexo, nódulo, AML, ectasia | nenhum |
| — Alteração difusa (texto), medidas L×AP×T (cm), espessura (cm) | livre | vazio |
| — Raros | nefrocalcinose | nenhum |
| Ureteres — Dilatação | Ausente / Presente (texto livre "lado/grau") | **Ausente** |
| Bexiga — Repleção | Adequada / Moderada / Pequena / Insuficiente / Vazia | **Adequada** |
| — Parede; espessura (mm) | Regular e fina / Espessada / Trabeculada | **Regular e fina** |
| — Conteúdo | debris, cálculo, coágulo, sonda, divertículo, ureterocele, lesão focal | nenhum |
| — Jatos ureterais | Não avaliados / Presentes e simétricos / Reduzido ou ausente unilateral (lado) / Não caracterizados | Não avaliados |
| — Volume pré-miccional; esvaziamento | mL; Não avaliado / desprezível / valor / dupla micção / sondado | vazio; Não avaliado |

Não existe: rim **não visualizado / ausente / nefrectomia / agenesia / transplantado**, lado do ureter como controle, nível de obstrução, Doppler.

## 3. Provas (sintéticas)

| # | Controle e estado | Corpo (resumo) | Conclusão (resumo) | Pendência | Veredito |
| --- | --- | --- | --- | --- | --- |
| U1 | inicial intocado | rins "topografia habitual, dimensões preservadas, diferenciação preservada"; bexiga normal | "Rins ecograficamente normais"; "Não há sinais de dilatação ureteral"; bexiga normal | nenhuma | `defeito confirmado`: laudo integralmente normal sem nenhum dado (sem medida renal, sem jatos) |
| U2 | rim E: dilatação moderada + cálculo 8 mm polo inferior + medidas | rim E com medidas, dilatação moderada, imagem com sombra 0,8 cm no polo inferior; rim D intacto | rim D normal; hidronefrose moderada à E; litíase à E | nenhuma | `observado no LaudoUSG`: lateralidade correta; conclusão não cita a medida do cálculo (`candidato`) |
| U3 | rim D "nefrectomia" (único caminho: alteração difusa) | "Rim direito em topografia habitual, de dimensões preservadas…" **seguido de** "rim direito não caracterizado (nefrectomia prévia)." (minúscula) | rim D **some** da conclusão; nada sobre nefrectomia | nenhuma | `defeito confirmado` (P0): corpo afirma rim presente e normal e o nega na linha seguinte |
| U3b | rim D "dimensões reduzidas" sem medida | "de dimensões reduzidas" | "Redução das dimensões do rim direito" | nenhuma | `candidato a lacuna`: redução sem medida |
| U4 | volume pré 320 mL + resíduo 140 mL | bexiga normal + volume pré | bexiga normal + "Resíduo pós-miccional de 140 mL" | nenhuma | `defeito confirmado` (P2): resíduo só na conclusão, ausente do corpo |
| U4b | resíduo marcado sem valor | — | — | 2 bloqueantes (duplicadas: "exige volume válido" e "formato inválido") | `observado`: bloqueia; mensagem dupla |
| U4c | bexiga vazia | rins normais; bexiga vazia não avaliável | "Não há sinais de dilatação ureteral" mantido | nenhuma | `candidato a lacuna`: ureter distal afirmado sem bexiga avaliável |
| U5 | U2 e depois litíase=[] e dilatação=Ausente | rim E normal + medidas | "Rins ecograficamente normais" | nenhuma | `observado`: sem resíduo de texto |
| U6 | U2 + ureter "ureter direito dilatado, 9 mm" | linha livre "ureter direito dilatado, 9 mm." (minúscula, sem nível) | "Dilatação ureteral (ureter direito…)" com hidronefrose só à E | nenhuma | `candidato a lacuna`: lado do ureter não é controle; sem aviso de incoerência |
| U6b | ureter "Presente" sem texto | **nada no corpo** | "Dilatação ureteral." | nenhuma | `defeito confirmado` (P1): conclusão sem corpo e sem lado |
| U7 | rim E cálculo marcado sem medida | imagem com sombra "em polo superior" | "Litíase no rim esquerdo, em polo superior" | nenhuma | `defeito confirmado` (P1): localização padrão vira fato; cálculo sem medida não pende |

## 4. Lacunas concretas

1. **P0 — rim ausente/não visualizado/nefrectomia/agenesia sem estado próprio** (U3): o texto contraditório chega ao laudo. Mínimo: estado por rim `presente | não visualizado (motivo) | ausente cirúrgico | ausente congênito | enxerto`, que remove as frases de normalidade e entra na conclusão. Paridade: extrator da API (`VIAS_URINARIAS.ts:248-307`) também não tem o campo e diz "silêncio = normalidade".
2. **P1 — normalidade pré-marcada** (U1): dimensões, diferenciação, dilatação, ureteres e bexiga começam normais e geram "Rins ecograficamente normais" sem medida. Mínimo: aviso/pendência quando não há medida renal; ureteres "não avaliados" como padrão.
3. **P1 — localização do cálculo pré-marcada "polo superior"** e cálculo sem medida sem pendência (U7). Também vale para cisto complexo/nódulo/AML (`urinaryShared.ts:549,558,618`).
4. **P1 — dilatação ureteral sem lado como controle e sem corpo** (U6, U6b). Mínimo: lado obrigatório, segmento (proximal/médio/distal/JUV), calibre em mm; aviso de incoerência com o lado da hidronefrose.
5. **P1 — "Aparelho urinário com Doppler" sem caminho único** (§1.1): Doppler renal perde bexiga/ureteres; vias urinárias perde Doppler. Mínimo: associação `VIAS_URINARIAS + DOPPLER_RENAL` com rins como estrutura compartilhada (padrão da bexiga em Abdome + Próstata).
6. **P2 — resíduo pós-miccional só na conclusão** (U4); mensagem de pendência duplicada (U4b); medida do cálculo ausente da conclusão (U2).
7. **P2 — bexiga vazia mantém "sem dilatação ureteral"** (U4c).
8. **P2 — paridade**: RN/iOS só ditado (writer); renderer da API dormente.

## 5. Requisitos originais

**Modelo normal**
| Estrutura | Dado mínimo para "normal" | Intenção no corpo | Intenção na conclusão |
| --- | --- | --- | --- |
| Cada rim | presença + medida longitudinal (ideal L×AP×T) + parênquima | tópico, dimensões com medida, diferenciação, sem dilatação e sem cálculo | rins sem alterações, por lado se houver assimetria |
| Ureteres | avaliados (não visualização = normal só se declarado) | ureteres não dilatados nos segmentos visualizados | sem dilatação, ou "não avaliados" |
| Bexiga | repleção adequada | paredes e conteúdo | bexiga sem alterações |
| Jatos / resíduo | só se avaliados | descrever quando informados | resíduo com valor no corpo e na conclusão |

**Biblioteca de alterações**
| id | Dados mínimos | Corpo | Conclusão | Salvaguardas |
| --- | --- | --- | --- | --- |
| `rim_nao_visualizado` | lado, motivo | rim não visualizado na loja e em topografias habituais | não visualização do rim do lado | apaga normalidade daquele lado |
| `rim_ausente_cirurgico` / `agenesia` | lado; antecedente informado pelo médico | loja vazia; rim contralateral descrito | estado pós-nefrectomia / ausência | nunca inferir causa; confirmação médica |
| `dilatacao_pielocalicial` | lado, grau, medida da pelve (mm) | grau e medida | hidronefrose do lado | lado obrigatório |
| `calculo_renal` | lado, maior eixo (mm), localização escolhida | imagem com sombra, medida, local | litíase do lado com medida | nenhum local por padrão |
| `dilatacao_ureteral` | lado, segmento, calibre (mm) | ureter do lado dilatado até o segmento | dilatação ureteral do lado | aviso se hidronefrose no outro lado |
| `residuo_pos_miccional` | volume pré e pós (mL) | ambos no corpo | resíduo com valor | unidade mL; sem classe automática (`candidato` a faixa com fonte) |
| `jato_ausente` | lado | ausência do jato do lado | conforme | lado obrigatório (já existe) |

**Formulário Web:** seções Rim D → Rim E (cada um com estado de presença primeiro) → Ureteres (por lado) → Bexiga → Esvaziamento. Nada normal pré-marcado sem medida; pendências bloqueantes: lado ausente, cálculo sem medida, localização não escolhida, ureter dilatado sem lado, rim não visualizado sem motivo. Avisos: lateralidade incoerente entre ureter e rim; bexiga vazia com ureteres declarados normais.

**Prompt mobile (extrator):** extrair por lado presença, medidas, dilatação (grau + medida), cálculos (medida + local), ureter (lado, segmento, calibre), bexiga, jatos, volumes. Nunca presumir rim presente quando o médico diz não visualizado/nefrectomia; nunca presumir ureteres avaliados nem localização de cálculo; nunca converter cm³/mL sem a unidade.

## 6. Perguntas para a rodada no concorrente
- Diferença real entre "Aparelho Urinário" e "… com Doppler": quais campos o Doppler acrescenta (artérias, IR, jatos coloridos) e se a bexiga permanece.
- Como trata rim não visualizado, nefrectomia, agenesia e rim transplantado.
- Se ureter tem lado e segmento como controle; se a hidronefrose pede medida.
- Se o modelo inicial já vem normal sem medidas e se há aviso.
- Se a localização do cálculo tem padrão.
- Se o resíduo pós-miccional entra no corpo e se há classificação automática.

## 7. Ordem sugerida
1. P0: estado de presença por rim (Web + extrator da API), com remoção das frases de normalidade.
2. P1: tirar a localização padrão do cálculo/lesões; cálculo sem medida vira pendência.
3. P1: ureter por lado com segmento e calibre; corpo obrigatório quando presente.
4. P1: aviso de normalidade sem medida renal; ureteres "não avaliados" como padrão.
5. P1: associação `VIAS_URINARIAS + DOPPLER_RENAL` com rins compartilhados.
6. P2: resíduo no corpo; pendência sem duplicata; ureteres com bexiga vazia.
