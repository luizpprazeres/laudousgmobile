# Rebench final antes do GO de deploy (10/10/2026)

Branch `chore/rebench-final` (base `c7413d0a`: W11 léxico, W14, W14b integrados). Haiku 5.5 com `BENCH_MODEL` explícito,
concorrência 2, os mesmos laudos das rodadas finais W10b/W10c. Caminho de cada categoria = o do código integrado:
writer completo (abdome total/superior, vias, mama), writer genérico (parede), renderer + Haiku extrator (tireoide),
writer dedicado (partes moles). A bancada passou a aplicar o léxico da casa como a rota (`9a80d1c8`). Rodadas e HTML locais
em `tmp-review/bench-haiku/rebench-final/` (dados reais).

## Veredito

**Sem regressão em abdome, vias, parede, tireoide, abdome superior e partes moles. Mama REGREDIU nas axilas** (causa:
A05 da W14, contrato da mama) — corrigir antes do GO da mama.

## Placar determinístico (sem juiz)

| Categoria (laudos) | Referência final | Agora | Leitura |
|---|---|---|---|
| Abdome total (38) | W10b B8: omitidas 0,6% · medidas ausentes 0/106 · estrutura 0 · numeração 0 · fechamento 3 · [REVISAR] 5 | 0,6% · 1/106 · 1 · 1 · 3 · 5 | igual (ver 1 defeito novo abaixo) |
| Vias (13) | omitidas 0% · medidas 1/125 · fechamento 0 · [REVISAR] 1 | 0% · 4/125 · 0 · 2 | igual (as 3 medidas são do caso do transplante, 261d5bb7, que oscila entre rodadas) |
| Parede (15) | W10b B7: omitidas 6/29 · estrutura 0 | 6/29 · 0 | igual ("06" = "em 06 fotos", retirado pela decisão 18) |
| Tireoide (20) | W10c A4: soma 47 | 48 | igual (mesmos eixos) |
| Abdome superior (1), partes moles (1) | — | sem defeito | — |
| **Mama (29)** | W10c B8: soma 13 · frases fixas omitidas 2 · numeração 0 | **16 · 7 · 3** | **regressão nas axilas** |

**Defeito novo, isolado (abdome, 1/38)**: o Haiku escreveu uma frase de narração ANTES do título ("…ditado de normalidade.
Gero o laudo normal completo…", ead3b7f4). O `writerOutputGuard` só remove comentário depois da conclusão — proposta para o
W1: cortar linha anterior ao primeiro título quando ela fala do ditado/do próprio trabalho (mesmo `META_RE`).

## Mama — axilas (repetido para separar de ruído)

Sintoma: com axilas ditadas sem alteração, "Linfonodos axilares normais." some da conclusão (às vezes também a frase do corpo),
às vezes com "[REVISAR — lado não ditado]" em "nas axilas" ou rótulo "Imagens de axilas:".

| Candidato (14 laudos com axila no ditado) | Saídas com defeito axilar |
|---|---|
| W10c final (B8) | 1/14 |
| Agora (B7) | 3/14 |
| Agora, 2 repetições (B6) | 7/28 |
| **Agora com o parágrafo de escopo de ANTES do A05** (só na bancada) | **2/28** |
| Agora + acréscimo mínimo ("a frase normal ditada não é alteração", só na bancada) | 4/28 — e numeração pior |

Causa: o A05 (`30d4ef37`) trocou "axilas citadas sem achado = normais" por "Sem alteração axilar ditada … / Com alteração
ditada … nunca 'Linfonodos axilares normais.'". O A05 corrige um defeito real (axilas excluídas ativando o escopo), então não
é para reverter às cegas: a W10c precisa reescrever o parágrafo mantendo a exclusão e o caso "axilas citadas sem achado =
normais, com o item na conclusão". O diff do acréscimo testado está em `tmp-review/bench-haiku/rebench-final/mama-axila-candidata.diff`.

## Léxico da casa (efeito medido na bancada)

| Camada | Trocas | Onde |
|---|---|---|
| Ditado | 35 | mama: quadrantes 16 ("superlateral/super lateral" → superolateral, "inferior lateral"…), "anecóica" 9; tireoide 5, parede 3, vias 1 ("anecóica"); abdome 1 ("segmento 4" → IV) |
| Saída | 0 | com o ditado corrigido e a regra de vocabulário no prompt, o Haiku já escreve na grafia da casa |

## Juiz cego (Opus 5.5) — só abdome + vias (a mama fica até a correção)

Rodada `rebench-final/juiz/2026-10-10T15-26-48-abdomen_total+vias_urinarias` (HTML `rebench-abdome-vias.html`). Nota média ·
casos com nota ≤ 4.

| Categoria | Produção | Haiku — prompt antigo | Haiku — final W10b | **Haiku — integrado hoje** |
|---|---|---|---|---|
| Abdome total (38) | 6,41 · 13 | 7,12 · 7 | 7,96 · 1 | **8,08 · 1** |
| Vias urinárias (13) | 4,58 · 8 | 6,04 · 1 | 7,04 · 0 | **6,77 · 1** |
| **Abdome + vias (51)** | 5,94 · 21 | 6,84 · 8 | 7,73 · 1 | **7,75 · 2** |

Nos 51: omissões 20 → 18, invenções 27 → 19, impressão igual à do final 39 → 40, estilo 7,71 → 7,78 (final W10b → hoje).
Graves de hoje, conferidos: 261d5bb7 (vias, rim transplantado com correção no meio do ditado — oscila entre rodadas desde a
W10b: 3 · 5,5 · 7) e 4d85200a (abdome, transcrição truncada do colédoco e lado do rim não ditado — 3,5 hoje, 3 na final W10b).

## Pendências para o GO

1. **Mama**: W10c corrige o parágrafo de escopo das axilas (A05) e repete os 14 laudos com axila (meta ≤ 2/28) + placar dos 29.
2. W1 (opcional): guard para narração do modelo antes do título.
3. Abdome, vias, parede, tireoide, abdome superior e partes moles: sem regressão — prontos do lado da bancada.
