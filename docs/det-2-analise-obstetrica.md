# DET-2 — Análise de saneamento OBSTETRICA

> Executado em 2026-06-11 contra o DB mobile (`yldtkqrsbgcnwlydrrot`), via `getDbClient` em consulta SELECT-only.
> Fonte viva: `~/laudousg/lib/categoryDefaults.ts` (`OBSTETRICA`) + contrato hardcoded em `apps/api/src/server/prompts/contracts/OBSTETRICA.ts`.
> Sem mudanças de DB/código neste arquivo.

## Evidência rodada

Comando oficial:

```bash
DIFF_VERBOSE=1 pnpm exec tsx scripts/diff-bundle-vs-original.ts OBSTETRICA
```

Resultado:

```text
OBSTETRICA: 29 blocos únicos | drift=168 gap=4
GAPs principais:
- extração de imagens com BPD/HC/AC/FL e peso fetal
- expansão dos marcadores de líquido amniótico do modelo 1
- conclusão inicial "Gestação em torno de ____ semanas e ____ dias."
- regras de peso fetal por percentil
```

Leitura do DB foi feita com `pnpm exec tsx` usando `getDbClient` de `packages/db/src/client`, apenas SELECT. O inventário abaixo é o agrupamento dos blocos `validated` por título, prioridade e estilos.

## Inventário dos blocos validated

| Kind | Título | Prio | Linhas/estilos | Classificação |
|---|---|---:|---:|---|
| modelo | obstetrica-modelo-template-inicial | 100 | 3/3 | manter, mas normalizar para template verbatim |
| modelo | obstetrica-modelo-template-padrao | 100 | 3/3 | manter, mas normalizar para template verbatim |
| regra | obstetrica-regra-selecao-automatica-modelo | 100 | 3/3 | duplicata do contrato hardcoded |
| regra | obstetrica-regra-ordem-secoes | 99 | 3/3 | curadoria deliberada |
| regra | obstetrica-regra-dias-da-ig-omitir-quando-zero | 96 | 3/3 | curadoria deliberada |
| regra | obstetrica-regra-liquido-amniotico-marcadores | 96 | 3/3 | curadoria deliberada |
| regra | obstetrica-regra-correcoes-transcricao | 95 | 3/3 | curadoria deliberada |
| regra | obstetrica-regra-dum-primeiraUSG-opcional | 95 | 3/3 | curadoria deliberada |
| regra | obstetrica-regra-preservar-terminologia-do-medico | 94 | 3/3 | curadoria deliberada |
| regra | obstetrica-regra-frases-normais-quando-omitido | 93 | 3/3 | curadoria deliberada |
| regra | obstetrica-regra-unidades-biometria-fetal | 93 | 3/3 | curadoria deliberada |
| regra | obstetrica-regra-dados-incompletos | 75 | 3/3 | manter; fonte viva, não coberto o bastante pelo contrato |
| regra | obstetrica-regra-peso-fetal-percentil | 75 | 3/3 | manter; fonte viva + operacional |
| regra | obstetrica-regra-calculo-dsm | 70 | 3/3 | duplicata do contrato hardcoded |
| regra | obstetrica-regra-gestacao-gemelar | 70 | 3/3 | manter; fonte viva detalhada |
| regra | obstetrica-regra-modelo-inicial | 70 | 3/3 | duplicata do contrato hardcoded |
| regra | obstetrica-regra-placenta-morfologicos | 70 | 3/3 | duplicata/parcialmente fora da categoria |
| frase | obstetrica-frase-primeira-usg-dum | 85 | 3/3 | duplicata de regra DUM/1a USG |
| frase | obstetrica-frase-biometria-fetal | 75 | 3/3 | duplicata do modelo padrao |
| frase | obstetrica-frase-inicial-achados | 75 | 3/3 | duplicata do modelo inicial |
| frase | obstetrica-frase-apresentacao-e-vitalidade | 70 | 3/3 | duplicata do modelo padrao |
| frase | obstetrica-frase-comentarios-padrao | 70 | 3/3 | duplicata dos modelos |
| frase | obstetrica-frase-placenta-padrao | 65 | 3/3 | duplicata do modelo padrao |
| frase | obstetrica-frase-anatomia-basica | 60 | 3/3 | duplicata do modelo padrao |
| conclusao | obstetrica-conclusao-gestacao-inicial | 80 | 4/4 | duplicata do modelo inicial; atenção ao estilo OBJETIVO |
| conclusao | obstetrica-conclusao-gestacao-padrao | 80 | 3/3 | duplicata do modelo padrao |
| conclusao | obstetrica-conclusao-peso-fetal-percentil | 80 | 3/3 | duplicata da regra peso fetal |
| excecao | obstetrica-excecao-titulo | 98 | 3/3 | duplicata do contrato hardcoded |
| excecao | obstetrica-excecao-marcadores-liquido-amniotico | 95 | 3/3 | duplicata da regra liquido-amniotico-marcadores |

## Classificação dos drifts

O `diff-bundle-vs-original` marca como drift qualquer trecho que não aparece verbatim na fonte viva. Para OBSTETRICA, a maior parte é curadoria mobile posterior ao original, não erro. A classificação útil para saneamento é por grupo de fragmentos:

| Bloco/grupo | Classificação | Decisão proposta |
|---|---|---|
| `obstetrica-modelo-template-inicial`, fragmentos "ORDEM OBRIGATORIA..." e instruções dentro do modelo | REESCRITA-SUSPEITA | modelo deve ser mascara verbatim; mover regra para seletor/contrato ou arquivar do corpo do modelo |
| `obstetrica-modelo-template-padrao`, fragmentos "se medico falou dias", setas e instruções de preenchimento | REESCRITA-SUSPEITA | normalizar para o template da fonte; dias/zero ficam em regra propria |
| `obstetrica-regra-selecao-automatica-modelo` | DUPLICATA | contrato hardcoded já define gatilhos; seletor determinístico deve virar código |
| `obstetrica-regra-ordem-secoes` | CURADORIA-DELIBERADA | preservar; veio de bug real de ordem de seções |
| `obstetrica-regra-dias-da-ig-omitir-quando-zero` | CURADORIA-DELIBERADA | preservar; entrada allowlist proposta |
| `obstetrica-regra-liquido-amniotico-marcadores` | CURADORIA-DELIBERADA | preservar; substitui regra global original, mais segura para corpo vs conclusão |
| `obstetrica-regra-correcoes-transcricao` | CURADORIA-DELIBERADA | preservar; regra mobile/Apple Speech |
| `obstetrica-regra-dum-primeiraUSG-opcional` | CURADORIA-DELIBERADA | preservar; mais segura que a fonte para omitir linha quando ausente |
| `obstetrica-regra-preservar-terminologia-do-medico` | CURADORIA-DELIBERADA | preservar; entrada allowlist proposta |
| `obstetrica-regra-frases-normais-quando-omitido` | CURADORIA-DELIBERADA | preservar; entrada allowlist proposta |
| `obstetrica-regra-unidades-biometria-fetal` | CURADORIA-DELIBERADA | preservar; regra operacional de cm/mm |
| `obstetrica-regra-dados-incompletos` | DUPLICATA PARCIAL | manter por enquanto; contrato atual nao cobre a regra de pergunta objetiva com a mesma clareza |
| `obstetrica-regra-peso-fetal-percentil` | DUPLICATA PARCIAL | manter; a regra e mais detalhada que o contrato e suporta guard determinístico |
| `obstetrica-regra-calculo-dsm` | DUPLICATA | contrato hardcoded já traz DSM detalhado |
| `obstetrica-regra-gestacao-gemelar` | DUPLICATA PARCIAL | manter; fonte viva detalha placenta/liquido/conclusao gemelar melhor que o contrato |
| `obstetrica-regra-modelo-inicial` | DUPLICATA | contrato hardcoded já cobre regras do modelo inicial |
| `obstetrica-regra-placenta-morfologicos` | DUPLICATA / FORA DE ESCOPO | arquivar em OBSTETRICA; morfológico tem regra própria |
| `obstetrica-frase-*` | DUPLICATA | arquivar; são fragmentos literais dos modelos |
| `obstetrica-conclusao-gestacao-*` | DUPLICATA | arquivar; conclusões já ficam dentro dos modelos |
| `obstetrica-conclusao-peso-fetal-percentil` | DUPLICATA | arquivar; manter só a regra de peso fetal |
| `obstetrica-excecao-titulo` | DUPLICATA | arquivar; contrato hardcoded e regra global já cobrem |
| `obstetrica-excecao-marcadores-liquido-amniotico` | DUPLICATA | arquivar; manter só `regra-liquido-amniotico-marcadores` |

Entradas de allowlist propostas:

```json
[
  {
    "category": "OBSTETRICA",
    "blockTitle": "obstetrica-regra-ordem-secoes",
    "reason": "Curadoria mobile validada por bug real: impede COMENTARIOS/ACHADOS/CONCLUSAO fora de ordem."
  },
  {
    "category": "OBSTETRICA",
    "blockTitle": "obstetrica-regra-dias-da-ig-omitir-quando-zero",
    "reason": "Curadoria mobile: omite dias quando o medico dita apenas semanas ou zero dias."
  },
  {
    "category": "OBSTETRICA",
    "blockTitle": "obstetrica-regra-liquido-amniotico-marcadores",
    "reason": "Curadoria mobile: protocolo corpo vs conclusao para ILA/MBV e classificacao explicita."
  },
  {
    "category": "OBSTETRICA",
    "blockTitle": "obstetrica-regra-correcoes-transcricao",
    "reason": "Curadoria mobile para erros do ditado/Apple Speech."
  },
  {
    "category": "OBSTETRICA",
    "blockTitle": "obstetrica-regra-dum-primeiraUSG-opcional",
    "reason": "Curadoria mobile: matriz de omissao/inclusao de DUM e primeira USG."
  },
  {
    "category": "OBSTETRICA",
    "blockTitle": "obstetrica-regra-preservar-terminologia-do-medico",
    "reason": "Curadoria mobile cross-category: preservar vocabulario ditado pelo medico."
  },
  {
    "category": "OBSTETRICA",
    "blockTitle": "obstetrica-regra-frases-normais-quando-omitido",
    "reason": "Curadoria mobile: defaults qualitativos sem inventar medidas."
  },
  {
    "category": "OBSTETRICA",
    "blockTitle": "obstetrica-regra-unidades-biometria-fetal",
    "reason": "Curadoria mobile: conversao segura cm->mm para biometria fetal."
  }
]
```

## Variantes conflitantes e seletor determinístico

OBSTETRICA tem 6 linhas `kind=modelo`, mas são 2 modelos únicos x 3 estilos: `inicial` e `padrao`. Eles nunca devem entrar juntos.

Proposta de seletor:

```ts
OBSTETRICA: {
  variants: [
    {
      tag: "inicial",
      positive: /\b(obst[eé]trica\s+inicial|primeiro\s+trimestre|1[ºo]?\s*tri|1[ºo]?\s*trimestre|ccn|dsm|saco\s+gestacional|ves[ií]cula\s+vitelina|embri[aã]o)\b/i,
      negation: /\b(n[aã]o\s+(?:usar|fazer|gerar|selecionar)\s+(?:o\s+)?modelo\s+inicial|n[aã]o\s+e\s+(?:obst[eé]trica\s+)?inicial|n[aã]o\s+e\s+primeiro\s+trimestre)\b/i
    },
    {
      tag: "padrao",
      positive: /\b(segundo\s+trimestre|terceiro\s+trimestre|2[ºo]?\s*tri|3[ºo]?\s*tri|dbp|cc\s+de|ca\s+de|cf\s+de|peso\s+fetal)\b/i
    }
  ],
  numericRule: "IG <= 13s6d => inicial; IG >= 14s0d => padrao",
  precedence: "negacao explicita > padrao explicito > inicial explicito/IG <=13s6d > padrao"
}
```

Observação: "transvaginal" sozinho é gatilho fraco. A fonte original usa "exame transvaginal sem biometria DBP/CC/CA/CF". No código, o seletor deve checar ausência de biometria antes de mandar para `inicial`.

## Proposta final manter/arquivar

| Título | Ação | Motivo |
|---|---|---|
| obstetrica-modelo-template-inicial | MANTER + normalizar | template inicial, selecionado por gatilho |
| obstetrica-modelo-template-padrao | MANTER + normalizar | template padrão, selecionado por gatilho |
| obstetrica-regra-ordem-secoes | MANTER | curadoria de estrutura |
| obstetrica-regra-dias-da-ig-omitir-quando-zero | MANTER | curadoria de IG sem zero dias |
| obstetrica-regra-liquido-amniotico-marcadores | MANTER | regra operacional mais forte |
| obstetrica-regra-correcoes-transcricao | MANTER | ditado mobile |
| obstetrica-regra-dum-primeiraUSG-opcional | MANTER | omissão/inclusão segura |
| obstetrica-regra-preservar-terminologia-do-medico | MANTER | fidelidade vocabular |
| obstetrica-regra-frases-normais-quando-omitido | MANTER | defaults qualitativos |
| obstetrica-regra-unidades-biometria-fetal | MANTER | unidade de biometria |
| obstetrica-regra-dados-incompletos | MANTER | pergunta objetiva / gerar mesmo assim |
| obstetrica-regra-peso-fetal-percentil | MANTER | regras clínicas de percentil |
| obstetrica-regra-gestacao-gemelar | MANTER | regra gemelar detalhada |
| obstetrica-regra-selecao-automatica-modelo | ARQUIVAR após seletor | duplicata do contrato/seletor |
| obstetrica-regra-calculo-dsm | ARQUIVAR | duplicata do contrato |
| obstetrica-regra-modelo-inicial | ARQUIVAR | duplicata do contrato |
| obstetrica-regra-placenta-morfologicos | ARQUIVAR | duplicata/parcialmente morfológico |
| obstetrica-frase-* | ARQUIVAR | fragmentos do template |
| obstetrica-conclusao-gestacao-* | ARQUIVAR | fragmentos do template |
| obstetrica-conclusao-peso-fetal-percentil | ARQUIVAR | duplicata da regra |
| obstetrica-excecao-* | ARQUIVAR | duplicatas do contrato/regra |

Bundle resultante proposto: 1 modelo selecionado (`inicial` ou `padrao`) + 11 regras preservadas. Sem `frase`, sem `conclusao`, sem `excecao`.

## Riscos específicos

O maior risco é falso positivo de modelo inicial por palavra solta. "Embrião não visualizado" ainda pode ser modelo inicial; "não é inicial" não pode. O seletor precisa separar negação de modelo da descrição clínica.

Outro risco é o estilo OBJETIVO: existe uma linha validated extra em `obstetrica-conclusao-gestacao-inicial` para `OBJETIVO`. Arquivar por título precisa verificar se o modo objetivo já está coberto pelo contrato objetivo, senão pode afetar a suíte `golden-objetivo`.

Por fim, se o bundle carregar os modelos atuais sem normalizar, ele leva instrução misturada dentro do `kind=modelo`. Isso não é fatal, mas reduz a pureza do DET-2: modelo deve ser máscara; regra deve ser regra; seletor deve ser código.

## Artefatos executáveis para revisão

SQL proposto: `docs/det-2-sql-obstetrica.sql`.

Allowlist proposta: `docs/det-2-allowlist-obstetrica.json`.

Entrada proposta para `MODELO_VARIANT_SELECTORS` em `bundleLoader.ts`:

```ts
OBSTETRICA: {
  variants: [
    {
      variantTag: "inicial",
      trigger:
        /\b(obst[eé]trica\s+inicial|primeiro\s+trimestre|1[ºo]?\s*tri(?:mestre)?|ccn|dsm|saco\s+gestacional|ves[ií]cula\s+vitelina|embri[aã]o)\b/i,
      negation:
        /\b(n[aã]o\s+(?:usar|fazer|gerar|selecionar)\s+(?:o\s+)?(?:modelo\s+)?inicial|n[aã]o\s+[ée]\s+(?:obst[eé]trica\s+)?inicial|n[aã]o\s+[ée]\s+(?:primeiro|1[ºo]?)\s*(?:tri|trimestre))\b/i,
    },
    {
      variantTag: "padrao",
      trigger:
        /\b(segundo\s+trimestre|terceiro\s+trimestre|2[ºo]?\s*tri(?:mestre)?|3[ºo]?\s*tri(?:mestre)?|dbp|cc\s+de|ca\s+de|cf\s+de|peso\s+fetal)\b/i,
      negation:
        /\b(n[aã]o\s+(?:usar|fazer|gerar|selecionar)\s+(?:o\s+)?(?:modelo\s+)?padr[aã]o)\b/i,
    },
  ],
  numericRule: "IG <= 13s6d => inicial; IG >= 14s0d => padrao",
  weakTriggerRule:
    "transvaginal so seleciona inicial se nao houver biometria DBP/CC/CA/CF",
  defaultVariantTag: "padrao",
}
```
