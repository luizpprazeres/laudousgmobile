# DET-2 — Analise de saneamento PELVE_FEMININA

> Executado em 2026-06-11 contra o DB mobile, leitura apenas.
> Fonte viva: `/Users/luizprazeres/laudousg/lib/categoryDefaults.ts` (`PELVE_FEMININA`) + contrato hardcoded `apps/api/src/server/prompts/contracts/PELVE_FEMININA.ts`.
> Comandos rodados: `DIFF_VERBOSE=1 pnpm exec tsx scripts/diff-bundle-vs-original.ts PELVE_FEMININA` e SELECT readonly via `pnpm exec tsx` usando `getDbClient` de `packages/db/src/client`.

## Resultado do diff

`PELVE_FEMININA`: 33 blocos unicos, `drift=36`, `gap=2` pelo script oficial. No reagrupamento por titulo, os drifts reais ficam concentrados em 9 titulos; os gaps sao trechos de contrato/fonte que ja estao cobertos pelo contrato hardcoded, mas nao batem byte-a-byte com o bundle.

## Inventario DB readonly

| Kind | Titulo | Prio | Estilos | Observacao |
|---|---|---:|---:|---|
| modelo | pelve-feminina-modelo-template-ta-tv | 100 | 3 | Modelo A, TA+TV, fonte viva |
| modelo | pelve-feminina-modelo-template-pos-abortamento | 70 | 3 | Modelo D, pos-abortamento/produtos retidos, fonte viva |
| modelo | pelve-feminina-modelo-template-ta | 70 | 3 | Modelo C, transabdominal, fonte viva |
| modelo | pelve-feminina-modelo-template-tv | 70 | 3 | Modelo B, transvaginal, fonte viva |
| regra | pelve-feminina-regra-regras-gerais-pelve | 100 | 3 | Duplica contrato hardcoded |
| regra | pelve-feminina-regra-selecao-ordem-roteamento | 99 | 3 | Duplica contrato hardcoded |
| regra | pelve-feminina-regra-posicao-medidas-diagnostico-recomendacao | 98 | 3 | Duplica contrato hardcoded |
| regra | pelve-feminina-regra-endometrio-e-ovarios | 94 | 3 | Duplica contrato hardcoded |
| regra | pelve-feminina-regra-preservar-terminologia-do-medico | 94 | 3 | Curadoria mobile cross-category |
| regra | pelve-feminina-regra-frases-normais-quando-omitido | 93 | 3 | Curadoria mobile cross-category |
| regra | pelve-feminina-regra-posicao-uterina-vocabulario | 90 | 3 | Curadoria mobile/recorte operacional |
| regra | pelve-feminina-regra-miomas | 75 | 3 | Fonte viva + metadados/gatilhos extras |
| regra | pelve-feminina-regra-sindrome-ovarios-policisticos | 75 | 3 | Fonte viva + metadados/gatilhos extras |
| regra | pelve-feminina-regra-tabela-referencia-etaria | 72 | 3 | Duplica fonte/contrato |
| regra | pelve-feminina-regra-adenomiose | 70 | 3 | Duplica fonte/contrato |
| regra | pelve-feminina-regra-calcificacao-arqueadas-cistos-naboth | 70 | 3 | Duplica fonte/contrato |
| regra | pelve-feminina-regra-cisto-ovariano-funcional-orads | 70 | 3 | Duplica fonte/contrato |
| regra | pelve-feminina-regra-diu | 70 | 3 | Duplica fonte/contrato |
| regra | pelve-feminina-regra-endometrioma | 70 | 3 | Duplica fonte/contrato |
| regra | pelve-feminina-regra-istmocele | 70 | 3 | Duplica fonte/contrato |
| regra | pelve-feminina-regra-medidas-incompletas-com-aviso | 70 | 3 | Curadoria mobile equivalente ao contrato, texto nao verbatim |
| regra | pelve-feminina-regra-menopausa-endometrio-espessado | 70 | 3 | Duplica fonte/contrato |
| regra | pelve-feminina-regra-menopausa-ovarios-atroficos | 70 | 3 | Duplica fonte/contrato |
| regra | pelve-feminina-regra-modelo-pos-abortamento | 70 | 3 | Duplica regras do Modelo D |
| regra | pelve-feminina-regra-padrao-diagnostico-conclusao | 70 | 3 | Curadoria/recorte da regra 16 |
| regra | pelve-feminina-regra-padrao-recomendacao-clinica | 70 | 3 | Curadoria/recorte da regra 17 |
| regra | pelve-feminina-regra-polipo-endometrial | 70 | 3 | Duplica fonte/contrato |
| frase | pelve-feminina-frase-frases-endometrio | 90 | 3 | Duplica fonte/contrato |
| conclusao | pelve-feminina-conclusao-adenomiose-conclusao-variantes | 75 | 3 | Curadoria mobile com variantes expandidas |
| conclusao | pelve-feminina-conclusao-conclusao-pos-abortamento | 70 | 3 | Duplica modelo D |
| conclusao | pelve-feminina-conclusao-conclusao-ta-normal | 70 | 3 | Duplica modelo C |
| conclusao | pelve-feminina-conclusao-conclusao-ta-tv-normal | 70 | 3 | Duplica modelo A |
| conclusao | pelve-feminina-conclusao-conclusao-tv-normal | 70 | 3 | Duplica modelo B |

## Classificacao dos fragmentos de drift

| Titulo | Fragmentos | Classe | Decisao |
|---|---:|---|---|
| pelve-feminina-regra-preservar-terminologia-do-medico | 11 | CURADORIA-DELIBERADA | Preservar; propor allowlist por `blockTitle` |
| pelve-feminina-regra-frases-normais-quando-omitido | 9 | CURADORIA-DELIBERADA | Preservar; propor allowlist por `blockTitle` |
| pelve-feminina-regra-posicao-uterina-vocabulario | 3 | CURADORIA-DELIBERADA | Preservar; propoe regra operacional contra transcricao ruim |
| pelve-feminina-regra-miomas | 2 | DUPLICATA | Os fragmentos sao introducao/gatilhos; conteudo clinico ja esta no contrato |
| pelve-feminina-regra-sindrome-ovarios-policisticos | 2 | DUPLICATA | Os fragmentos sao introducao/gatilhos; conteudo clinico ja esta no contrato |
| pelve-feminina-regra-medidas-incompletas-com-aviso | 2 | CURADORIA-DELIBERADA | Preservar se quiser reforco de seguranca; texto equivale a regra 15 |
| pelve-feminina-regra-padrao-diagnostico-conclusao | 3 | CURADORIA-DELIBERADA | Preservar como reforco curto da regra 16 |
| pelve-feminina-regra-padrao-recomendacao-clinica | 2 | CURADORIA-DELIBERADA | Preservar como reforco curto da regra 17 |
| pelve-feminina-conclusao-adenomiose-conclusao-variantes | 2 | CURADORIA-DELIBERADA | Preservar; amplia variantes sem quebrar a regra da fonte |

Entradas propostas para `scripts/diff-allowlist.json`, sem aplicar agora: `pelve-feminina-regra-preservar-terminologia-do-medico`, `pelve-feminina-regra-frases-normais-quando-omitido`, `pelve-feminina-regra-posicao-uterina-vocabulario`, `pelve-feminina-regra-medidas-incompletas-com-aviso`, `pelve-feminina-regra-padrao-diagnostico-conclusao`, `pelve-feminina-regra-padrao-recomendacao-clinica`, `pelve-feminina-conclusao-adenomiose-conclusao-variantes`.

## Variantes conflitantes e seletor deterministico

PELVE tem 12 linhas `kind=modelo` no DB porque sao 4 modelos unicos x 3 estilos. Eles nunca podem entrar juntos no bundle.

Proposta de seletor:

| Variante | Modelo | Gatilho positivo | Negacao que deve vencer |
|---|---|---|---|
| `pos_abortamento` | pelve-feminina-modelo-template-pos-abortamento | `produtos retidos`, `restos ovulares`, `restos placentarios`, `pos-abortamento`, `controle ... aborto`, `esvaziamento uterino`, `abortamento incompleto/em curso/retido` | `sem produtos retidos`, `sem restos ovulares`, `sem restos placentarios`, `nega aborto`, `sem historia de aborto`, `abortos previos` |
| `ta_tv` | pelve-feminina-modelo-template-ta-tv | presenca positiva de via abdominal/suprapubica/bexiga repleta E via vaginal/transvaginal/endovaginal | `sem transvaginal`, `nao foi realizada transvaginal`, `apenas transabdominal`; ou `sem transabdominal`, `apenas transvaginal` |
| `tv` | pelve-feminina-modelo-template-tv | `transvaginal`, `endovaginal`, `via vaginal`, `vaginal` | `sem transvaginal`, `nao realizar via vaginal`, `transvaginal nao realizada`, `apenas transabdominal` |
| `ta` | pelve-feminina-modelo-template-ta | `transabdominal`, `via abdominal`, `suprapubica`, `bexiga repleta` | `sem transabdominal`, `nao realizar transabdominal`, `apenas transvaginal` |

Precedencia proposta: primeiro abortamento ativo; se negado, ignora abortamento. Depois resolve vias. Se nenhuma via for positiva, default seguro deve ser `ta_tv`, igual comportamento historico, mas esse default precisa ser explicitado para nao depender de prioridade.

## Proposta manter/arquivar

| Titulo | Acao proposta | Motivo |
|---|---|---|
| pelve-feminina-modelo-template-ta-tv | Manter | Variante `ta_tv`; necessario para gate `kind=modelo` |
| pelve-feminina-modelo-template-tv | Manter | Variante `tv` |
| pelve-feminina-modelo-template-ta | Manter | Variante `ta` |
| pelve-feminina-modelo-template-pos-abortamento | Manter | Variante `pos_abortamento` |
| pelve-feminina-regra-preservar-terminologia-do-medico | Manter | Curadoria deliberada |
| pelve-feminina-regra-frases-normais-quando-omitido | Manter | Curadoria deliberada |
| pelve-feminina-regra-posicao-uterina-vocabulario | Manter | Protecao contra transcricao/fonetica |
| pelve-feminina-regra-medidas-incompletas-com-aviso | Manter | Reforco de seguranca de medida invalida |
| pelve-feminina-regra-padrao-diagnostico-conclusao | Manter | Reforco curto de frase diagnostica |
| pelve-feminina-regra-padrao-recomendacao-clinica | Manter | Reforco curto de recomendacao |
| pelve-feminina-conclusao-adenomiose-conclusao-variantes | Manter | Curadoria especifica aceitavel |
| Demais regras/frases/conclusoes fonte-viva | Arquivar | Duplicam contrato hardcoded ou o modelo selecionado |

Composicao resultante do bundle: 1 modelo selecionado deterministicamente + 7 blocos de curadoria/reforco. O contrato hardcoded continua carregando a fonte viva completa.

## Riscos especificos

O maior risco e seletor por via com palavra solta `vaginal` ou `abdominal`: ditados como "nao foi realizada transvaginal" ou "apenas transabdominal, sem vaginal" precisam ser negativos antes do positivo. O segundo risco e o modelo D sequestrar laudo por historico obstetrico antigo; `abortos previos` nao pode selecionar pos-abortamento. O terceiro risco e manter muitas regras duplicadas do contrato, aumentando contradicao e custo de prompt sem ganho.

## Artefatos executaveis para revisao

- SQL: `docs/det-2-sql-pelve_feminina.sql`
- Allowlist: `docs/det-2-allowlist-pelve_feminina.json`

## Entrada proposta de seletor / reuso

Recomendacao: reusar a ideia de `applyPelveRouteSelection` tambem no caminho bundle, mas mover a selecao para antes do gate `BUNDLE_NO_TEMPLATE`, porque no bundle todos os modelos validated da categoria entram juntos. A funcao atual foi feita para filtrar resultado de retriever; para bundle ela precisa operar em todos os modelos e nunca deixar mais de um `kind=modelo`.

Default proposto quando via nao e ditada: `TA_TV`, por compatibilidade com o historico e por ser o modelo mais completo. Esse default deve ser explicito, nao derivado de priority.

```ts
PELVE_FEMININA: {
  variantTag: "pelve-route",
  defaultVariantTag: "ta-tv",
  selectors: [
    {
      variantTag: "pos-abortamento",
      trigger: /produtos?\s+retid|restos\s+ovulares|restos\s+placent|p[óo]s[-\s]?abort|controle\s+.{0,15}abort|esvaziamento\s+uterino|abort(o|amento)\s+(retido|incompleto|em\s+curso)/i,
      negation: /\b(?:sem|aus[eê]ncia\s+de|nega(?:\s+hist[oó]ria\s+de)?)\s+(?:produtos?\s+retid|restos\s+ovulares|restos\s+placent|abort)|abortos?\s+pr[eé]vios?/i,
    },
    {
      variantTag: "ta-tv",
      trigger: /(?=.*(?:transabdominal|via\s+abdominal|suprap[uú]bic|bexiga\s+repleta))(?=.*(?:transvaginal|endovaginal|via\s+vaginal))/i,
      negation: /\b(?:sem|n[aã]o\s+(?:foi\s+)?(?:realizad[ao]|feita?)|apenas|somente)\s+(?:transvaginal|via\s+vaginal|transabdominal|via\s+abdominal)/i,
    },
    {
      variantTag: "tv",
      trigger: /\b(?:transvaginal|endovaginal|via\s+vaginal)\b/i,
      negation: /\b(?:sem|n[aã]o\s+(?:foi\s+)?(?:realizad[ao]|feita?)|n[aã]o\s+realizar|apenas\s+transabdominal|somente\s+transabdominal)\s+(?:transvaginal|via\s+vaginal)/i,
    },
    {
      variantTag: "ta",
      trigger: /\b(?:transabdominal|via\s+abdominal|suprap[uú]bic|bexiga\s+repleta)\b/i,
      negation: /\b(?:sem|n[aã]o\s+(?:foi\s+)?(?:realizad[ao]|feita?)|n[aã]o\s+realizar|apenas\s+transvaginal|somente\s+transvaginal)\s+(?:transabdominal|via\s+abdominal)/i,
    },
  ],
}
```

ARTEFATOS DET-2 DEX2 PRONTOS
