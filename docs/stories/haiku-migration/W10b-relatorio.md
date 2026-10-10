# W10b — Prompt enxuto do abdome total e das vias urinárias (+ regras globais) — relatório

Branch `fix/abdome-vias-prompt` (a partir de `feat/haiku-migration`). 10/10/2026. Sem push, deploy, env ou banco.

## O que mudou

| Commit | O quê |
|---|---|
| `b2c9c111` | Bancada: `placar-writer.ts` (placar determinístico do writer completo), `system-tamanho.ts`, `padroes-finais.ts`, `BENCH_BIBLIOTECA` |
| `356e0224` | **GLOBAL-FINAL** — regras da casa enxutas fora da família obstétrica (`global.ts`, `buildSystemMessage.ts`) |
| `944cb81f` | Contrato do abdome reescrito; contrato novo das vias urinárias; `PROMPT_VERSION` v1.9 |
| `c6f0f311` | Biblioteca proposta (JSON da bancada + SQL **não aplicado**) |

### Global (dono: W10b) — vale para todo o writer fora da obstetrícia

- O `GLOBAL_RULES_BLOCK` + `GLOBAL_PROHIBITIONS` + CoT somavam 23,9 mil caracteres, a maior parte obstétrica
  (líquido amniótico com `{LINHA_LIQUIDO_AMNIOTICO}`, biometria, placenta, DUM, MCDA, título obstétrico) e de MSK, mama e
  tireoide — para o abdome, as vias, a mama…
- **Família obstétrica** (OBSTETRICA, DOPPLER_OBSTETRICO, MORFOLOGICO, CERVICOMETRIA): **byte a byte igual** (teste do
  morfológico, 528 prompts).
- **Demais:** `GLOBAL_RULES_LEAN` (5,3 mil car.) + conferência (0,5 mil) + reforço só da categoria (FIGO→pelve, tendões→MSK, mamas/axilas→mama,
  tireoide→tireoide; texto movido sem mudar a regra) + conferência final curta. Regras da casa mantidas: comando do médico,
  corpo descritivo, "que tem como diagnóstico mais provável", conduta só ditada (ou do contrato da categoria), texto puro.
- Regras novas, todas motivadas por defeito medido:
  - **laudo pronto colado** (11% dos ditados, T2): sai literal, mesmo de outro exame; não troca pelo modelo da categoria nem
    acrescenta frases dele. Sem isso, o prompt enxuto fez o Haiku forçar o abdome em laudo colado de carótidas/parede
    (medidas ditadas ausentes no abdome 1 → 34 na iteração B3);
  - **marcas `[REVISAR]` numa lista fechada** (magnitude, medida ambígua, calculadora, lado não ditado). O Haiku anotava
    "exame selecionado é Abdome Total", dúvidas de transcrição e "magnitude" em rim de recém-nascido;
  - **classificação**: ditada = reproduzida; não ditada = contrato da categoria (mama normal = BI-RADS 1, pedido da W10c) ou omitida.

### Abdome total (contrato)

Reescrito a partir dos 38 laudos finais de 90 dias: modelo-base literal (não os "resumos" da biblioteca), estrutura
alterada com a mesma abertura da frase do modelo, esteatose moderada/acentuada **no lugar** da linha dos vasos, rim não
visualizado e bexiga pouco repleta com as frases do renderer (iguais às vias), conclusão normal **sem número** (o modelo da
biblioteca traz "1." e o Haiku copiava), fechamento "Demais…" numerado. Estilo OBJETIVO mantém o contrato anterior.

### Vias urinárias (contrato novo)

Não havia contrato: o writer recebia o texto genérico + a biblioteca, que manda fechar com "Demais estruturas das vias
urinárias…" (o médico nunca usa: 0/13) e acrescentar recomendação clínica. Os 13 finais têm a conclusão **por estrutura,
sempre numerada**: rins → "Não há sinais de dilatação ureteral." → bexiga → resíduo (se ditado). O contrato traz as frases
do médico ("diâmetros longitudinal…corticomedular", medidas só se ditadas, rim ausente, repleção insuficiente, resíduo
"desprezível" nunca 0,0).

## Tamanho do system (writer clássico, biblioteca real do banco)

| Categoria | Antes | Depois | |
|---|---|---|---|
| ABDOMEN_TOTAL | 39.625 car. (~11,0 mil tokens) | 20.407 (~5,7 mil) | −49% |
| VIAS_URINARIAS | 35.661 (~9,9 mil) | 19.731 (~5,5 mil) | −45% (com contrato novo) |
| PAREDE_ABDOMINAL | 32.721 (~9,1 mil) | 14.490 (~4,0 mil) | −56% |
| MAMARIA | 36.060 (~10,0 mil) | 18.412 (~5,1 mil) | −49% (só o global; contrato é da W10c) |

Tokens estimados a 3,6 car./token. A biblioteca do banco passa a ser ~60% do system; a proposta abaixo tira mais ~4 mil.

## Medição — 66 laudos reais com final (90 dias), Haiku 5.5 com `BENCH_MODEL` explícito

Rodadas em `tmp-review/bench-haiku/w10b/` (locais, dados reais). B = prompt de hoje; B3–B7 = iterações; **B7 = final**;
B8 = B7 + biblioteca proposta injetada só na bancada (abdome e vias).

### Placar determinístico (contra o laudo final)

| Abdome (38) | omitidas | normal presumido | medidas ditadas ausentes | estrutura | numeração | fechamento | `[REVISAR]` |
|---|---|---|---|---|---|---|---|
| Produção (renderer) | 0/346 | 3 | 52/106* | 0 | 0 | 4 | 0 |
| Haiku — prompt de hoje | 2/346 | 6 | 1/106 | 2 | 2 | 7 | 9 |
| **Haiku — B7** | 2/346 | **3** | **0/106** | **0** | 1 | **4** | **4** |
| Haiku — B8 (+ biblioteca) | 2/346 | 3 | 0/106 | 0 | 0 | 3 | 5 |

\* um laudo de carótidas ditado dentro do abdome, que o renderer não reproduz.

| Vias (13) | omitidas | normal presumido | medidas ausentes | placeholder | fechamento | conduta | `[REVISAR]` |
|---|---|---|---|---|---|---|---|
| Produção (renderer) | 3/44 | 7 | 6/125 | 6 | 0 | 0 | 0 |
| Haiku — prompt de hoje | 17/44 (38,6%) | 10 | 1/125 | 1 | 8 | 0 | 7 |
| **Haiku — B7** | **0/44** | 7 | 3/125 | 0 | **0** | 1 | 3 |
| Haiku — B8 (+ biblioteca) | 0/44 | 7 | 1/125 | 0 | 0 | 0 | 1 |

| Parede (15, 3ª categoria) | omitidas | medidas ausentes | estrutura | `[REVISAR]` |
|---|---|---|---|---|
| Produção (writer gpt) | 10/29 | 8/28 | 0 | 2 |
| Haiku — prompt de hoje | 5/29 | 4/28 | 2 | 1 |
| **Haiku — B7** | 6/29 | **0/28** | **0** | **0** |

Leitura: "normal presumido" nas vias é quase todo a frase-padrão da bexiga onde o médico ditou outra redação normal
("contornos regulares e conteúdo anecoico") — não é invenção clínica. "Dx no corpo" do B7 (3) são laudos colados em que o
próprio médico escreveu "caracterizando…" e o B7 preservou. A diferença de omissões na parede é 1 caso.

### Juiz (Opus 5.5, cego, um juiz para os quatro candidatos)

Rodada `w10b/2026-10-10T12-05-54-abdomen_total+vias_urinarias+parede_abdominal` (HTML local `relatorio.html`).

| Categoria | Produção | Haiku — prompt de hoje | **Haiku — prompt novo (B7)** | B7 + biblioteca (B8) |
|---|---|---|---|---|
| Abdome (38) | 6,46 · 13 graves | 7,19 · 5 | **7,93 · 1** | 8,04 · 1 |
| Vias (13) | 4,54 · 8 | 6,27 · 0 | **6,81 · 1** | 7,19 · 0 |
| Parede (15) | 4,63 · 10 | 7,77 · 0 | **8,43 · 0** | — (não rodado) |
| **Total (66)** | 5,67 · 31 | 7,14 · 5 | **7,83 · 2** | abdome+vias: 7,82 · 1 (B7 7,65) |

Nota média · casos com nota ≤ 4. Nos 66: omissões 41 → 31, invenções 49 → 38, impressão igual à do final 51 → 55,
estilo 6,96 → 7,72 (prompt de hoje → B7).

Conferência à mão dos graves do B7 (o juiz erra; origem de cada um):
- **261d5bb7** (vias, 3): rim transplantado + nefrectomia com correção do médico no meio do ditado; o Haiku trocou as medidas
  entre rim nativo e transplante (erro de leitura do ditado, não do prompt). Prompt de hoje 5,5; produção 0,5.
- **8779de03** (vias, 4,5): ditado com transcrição truncada; o B7 escreveu "cisto simples" no corpo e uma **recomendação de
  TC não ditada** — vem do bloco da biblioteca `vias-urinarias-excecao-achado-cistico-renal-complexo` ("SEMPRE acompanhar de
  recomendação"); o B8, com o bloco reescrito, não a escreve.
- **4d85200a** (abdome, 4): "infundíbulo helatocoledoco medindo 6 mm" (ASR) — o Haiku atribuiu os 6 mm a um segundo cálculo
  em vez do hepatocolédoco; ambiguidade real do ditado (prompt de hoje 6).

## Achados de método

- Iterar com o placar e chamar o juiz só no fim funcionou: o placar pegou as duas regressões do prompt enxuto (laudo colado
  forçado para o abdome; paráfrase do laudo colado da parede) antes de gastar juiz.
- `BENCH_BIBLIOTECA` aborta quando a variante do modelo muda (ditado com "Doppler" escolhe o modelo esplâncnico) — virou aviso.
- O bundle escolhe o modelo **Doppler esplâncnico** do abdome quando o ditado colado é de carótidas ("Doppler" no texto).
  Fora do escopo (bundleLoader); o B7 sai certo porque o laudo colado vence o modelo.

## Decisões / pendências para o Luiz

1. **SQL da biblioteca** (`W10b-biblioteca-proposta.sql`, não aplicado): arquiva 7 blocos (abdome: "frases normais quando
   omitido" — resumos que conflitam com o modelo e trazem "Pâncreas parcialmente visualizado" como padrão; "preservar
   terminologia" — já no global. Vias: regras gerais, frase dos rins, numeração, fechamento "Demais…", **recomendação clínica
   automática**) e reescreve 5 (modelos sem "1." no normal e com as frases do médico; esteatose acentuada; área poupada com
   "que tem como diagnóstico mais provável"; cisto complexo sem recomendação obrigatória). Efeito medido no B8 (acima).
2. **Recomendação clínica nas vias**: a biblioteca manda acrescentar (massa, Bosniak, resíduo > 100 mL…); os 13 finais não
   têm nenhuma e a regra da casa é "sem conduta não ditada". Confirmar antes de arquivar o bloco.
3. **"em 06 fotos"**: o médico escreve isso nos laudos colados de parede/inguinal; a regra antiga da casa proíbe e o writer
   tira. Manter a proibição?
4. Numeração do abdome: os finais usam "1." e "1)" na mesma proporção; o contrato segue "1." (regra antiga do abdome).

## Gates

`pnpm -F api typecheck` ✓ · `morfologicoPercentilRules` (528 prompts; obstétrica byte-idêntica) ✓ · `hashimotoPolipoConditional` ✓ ·
`placentaConditional` ✓ · `w7-regras-da-casa` (71) ✓ · `livreTesteCategories` ✓ · `writerChosenExam` ✓ · `vias-urinarias-golden` (44) ✓.
Já falhavam antes (sem relação): `pelveAnexialConditional` e `writerHardening` (hash fixado de prompt antigo),
`obstetricaPlainWriter` (`earlyWriterV2Allowed`), `obstetricDopplerFlow` (`selectedHint`).

## Impacto nas outras frentes

O global enxuto muda o system de **todas** as categorias do writer fora da obstétrica (pelve, mama, tireoide, carótidas,
próstata…). W10a e W10c fazem a rodada final em cima de `356e0224`.
