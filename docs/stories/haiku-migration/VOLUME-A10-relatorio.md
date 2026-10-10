# "Calcule o volume" (writer completo e dedicados) e A10 de partes moles — relatório

Branch `feat/volume-calcule` (base `e4f62170`). Fonte: `DECISOES-LUIZ-2026-10-10.md`, rodada 2. Banco só leitura; sem push,
deploy nem env. A tireoide (renderer + extrator) é da W10c (`fix/tireoide-calcule-volume`), coordenada abaixo.

## 1. "Calcule o volume"

### O que os ditados reais mostram (365 dias, `volume-mineracao.ts`, sem LLM)

427 ditados citam "volume"; 8 pedem o cálculo: tireoide 3, próstata 3, pelve 2. Nos dois casos em que o modelo calculou
sozinho, **a conta saiu errada**: útero 5,9 x 4,0 x 3,8 → 47,0 cm³ (0,52 dá 46,6) e próstata com fator 0,55 (35,7 g). Por isso
a conta passou a ser do código; o prompt só garante o pedido, o lugar e o formato.

### O que mudou

| Onde | Como |
|---|---|
| Prompt — `VOLUME_CALCULO_RULE` (`prompts/global.ts`), uma regra só | no global enxuto (writer completo, fora da obstetrícia) e nos writers dedicados de pelve, MSK, partes moles e Doppler renal: volume ditado fica; só com pedido e 3 eixos ditados, C x L x AP x 0,52, em cm³ (ou na unidade do modelo), uma casa, logo após as medidas — "medindo 3,0 x 2,0 x 1,5 cm (volume de 4,7 cm³)"; sem pedido, nada. A pelve tinha "dado não ditado (volume): omita", que agora ressalva o pedido. |
| Guard — `pipeline/volumeGuard.ts` | com pedido: recalcula o volume escrito após as 3 medidas, **salvo o ditado**; o mesmo valor repetido na conclusão acompanha; conclusão sem volume no corpo é ligada pelos eixos da mesma estrutura ("Útero …"); total da tireoide = soma de todos os volumes exibidos (ditados + calculados); uma casa sempre ("5,0"). "não calcule"/"sem calcular" não contam como pedido. |
| Rota | writer completo: como antes (política inteira). Writer dedicado (`passthrough`): só com pedido (`{ soPedido: true }`); sem pedido nada muda. Renderer: não passa pelo guard. |
| Bancada | `bench-abdomen.ts` espelha o guard no writer dedicado; `sinteticos-volume.ts` (novo). |

Defeitos do guard antigo corrigidos (caminho writer): com pedido ele **recalculava também o volume ditado** (no exemplo da decisão,
V1 e V2 dos lobos), punha no total só a soma dos calculados e trocava por "____" o volume da conclusão quando não achava o volume
no formato "(volume de …)" no corpo.

Fora daqui: a família obstétrica (bloco global antigo, intocado); a próstata e a tireoide (renderer). A próstata calcula o peso
sempre (0,5233 × 1,05, curadoria A10 do W4) — convenção diferente da regra de 0,52, registrada para o Luiz/W4.

### Coordenação com a W10c

Mesma regra dos dois lados: 0,52, uma casa por parcela, volume ditado nunca recalculado, VT = soma das parcelas exibidas
(V1 + V2 + istmo). Diferença só de forma: no writer sai sempre uma casa ("6,0"); no renderer clássico da tireoide, "6".
As duas branches sobem `PROMPT_VERSION` para v1.13; **quem integrar a segunda põe v1.14** (conflito só em `version.ts`).

## 2. A10 — "Correlacionar com dados clínicos" (partes moles) só quando ditado

Nos 365 dias: 6 laudos gerados traziam a frase, nenhum ditado a pedia e **nenhum final assinado a manteve** (17 laudos, 4 finais).

| Onde | Como |
|---|---|
| Renderer (`PARTES_MOLES.ts`, clássico e objetivo) | sai das conclusões fixas de nódulo sólido, cisto, coleção e linfonodo. A extração ganhou `conduta` (só quando ditada, na redação do médico); o renderer a põe em parágrafo próprio no fim da conclusão. |
| Roteiro do writer | as três conclusões sem a frase; regra 5: conduta só se ditada, na redação do médico, "Correlacionar com dados clínicos." só quando ele ditar. |
| Few-shots | já estavam sem a frase (W14); teste novo garante que só aparece quando o ditado a tem. |

Fora do escopo (não é PARTES_MOLES): a mesma frase fixa existe no renderer de vias urinárias (nódulo sólido renal) e na web
(escrotal, região inguinal, histerossonografia, transplante renal, tireoide).

## 3. Testes

typecheck da API ✓ · `volumeGuard` 39/39 (exemplo da decisão: lobos ditados 6,0 e 5,5 ficam, istmo 0,6, VT 12,1; casos reais
8b72f549 e c3ffcd46 reproduzidos; negação; writer dedicado sem pedido intocado; regra presente no global enxuto e nos 4 writers,
ausente do bloco obstétrico) · partes moles golden 47 e objetivo 37 (negativo por tipo de lesão, positivo com a redação do médico,
sem duplicar) · prompt do writer de partes moles 27 · `generate-fail-closed` 41/41 · `lexicoDaCasa` 99 · `dsmGuard` 10/10 ·
writers dedicados (MSK prompt 31, auditoria/formato, pelve 50, partes moles 14, Doppler renal 37) · `writerOutputGuard` 17/17 ·
`writerChosenExam` 6/6 · `w14-revisao-global` 9 · morfológico 528 (obstetrícia byte a byte).

## 4. Bancada Haiku 5.5 (assinatura, concorrência 2)

Rodadas e saídas locais em `tmp-review/bench-haiku/volume/` (dados reais só lá).

**Sintéticos** (`sinteticos-volume.ts`, 15 ditados inventados × 2 repetições = 30 saídas): writer completo (abdome total,
vias), pelve, MSK e partes moles, com o mesmo pós-processamento da rota.

| | Resultado |
|---|---|
| Conta do Haiku sozinho (antes do guard) | 24/26 — errou 2: cisto renal 2,0 x 1,8 x 1,6 → 3,7 (certo 3,0) e coleção 5,0 x 3,0 x 2,0 → 7,8 (certo 15,6) |
| Texto final (depois do guard), volume + demais verificações | **60/60 · 30/30 saídas sem falha** |
| Sem pedido (abdome, pelve) e "não precisa calcular" | nenhum volume calculado (6/6) |
| Volume ditado com outro pedido no mesmo laudo | preservado (útero 80,2; ovários 6,1 e 5,4; bexiga 320 mL) |
| A10 | "Correlacionar" ausente nos 4 casos sem o pedido (8/8 saídas) e presente uma vez, na redação do médico, nos 2 com o pedido (4/4) |

**Placar real, sem piora:**

| Categoria | Linha de base | Agora | Leitura |
|---|---|---|---|
| Parede (15, writer completo, placar determinístico) | rebancada B6: omitidas 6/29 · medidas 4/28 · presumida 1 · estrutura 0 | omitidas 5/29 · medidas 4/28 · presumida 2 · estrutura 1 | igual; as 2 diferenças (título "PARede" e um "Ausência de coleções." a mais) não se repetiram em 2 repetições dos mesmos casos e não envolvem volume |
| Partes moles (4 laudos com final em 365 dias × 2; 3 deles são os few-shots) | Haiku em `e4f62170`: medidas ausentes 0 · conduta não ditada 0 · cabeçalhos 8/8 · [REVISAR] 2 | 0 · 0 · 8/8 · 2 | igual; nenhum desses 4 aciona a frase automática. O caso 0b2a0c38 (ditado com um abdome de outro slot) oscila nos dois lados: nas 4 repetições de cada, todas as 8 saídas escrevem também o abdome extra, e o laudo do palato fica perto do final em 2/4 (base) e 1/4 (A10) — defeito anterior, sem relação com a frase |

Abdome total e vias não foram rebancados: a mudança no global enxuto é a troca de uma frase de volume pela regra completa, e os
sintéticos V1–V5 rodam com o system real dessas categorias.
