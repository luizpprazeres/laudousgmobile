# DET-2 — Análise de saneamento MORFOLOGICO

> Executado em 2026-06-11 contra o DB mobile (`yldtkqrsbgcnwlydrrot`), via `getDbClient` em consulta SELECT-only.
> Fonte viva: `~/laudousg/lib/categoryDefaults.ts` (`MORFOLOGICO`).
> MORFOLOGICO ainda não tem contrato hardcoded em `apps/api/src/server/prompts/contracts/`, então o bundle precisa carregar mais regra do que OBSTETRICA.
> Sem mudanças de DB/código neste arquivo.

## Evidência rodada

Comando oficial:

```bash
DIFF_VERBOSE=1 pnpm exec tsx scripts/diff-bundle-vs-original.ts MORFOLOGICO
```

Resultado:

```text
MORFOLOGICO: 17 blocos únicos | drift=157 gap=12
GAPs principais:
- FUNÇÃO da categoria
- extração de biometria por trimestre
- seleção automática do modelo
- os três templates completos
- regras específicas de placenta/ossos longos/estrutura
```

Leitura do DB foi feita com `pnpm exec tsx` usando `getDbClient` de `packages/db/src/client`, apenas SELECT.

## Inventário dos blocos validated

| Kind | Título | Prio | Linhas/estilos | Classificação |
|---|---|---:|---:|---|
| modelo | morfologico-modelo-template-1t | 100 | 3/3 | manter, mas normalizar para template verbatim |
| modelo | morfologico-modelo-template-2t | 100 | 3/3 | manter, mas normalizar para template verbatim |
| modelo | morfologico-modelo-template-3t | 100 | 3/3 | manter, mas normalizar para template verbatim |
| regra | morfologico-regra-selecao-automatica-trimestre | 99 | 3/3 | manter até seletor virar código |
| regra | morfologico-regra-dias-da-ig-omitir-quando-zero | 96 | 3/3 | curadoria deliberada |
| regra | morfologico-regra-liquido-amniotico-marcadores | 96 | 3/3 | curadoria deliberada |
| regra | morfologico-regra-correcoes-transcricao | 95 | 3/3 | curadoria deliberada |
| regra | morfologico-regra-dum-primeiraUSG-opcional | 95 | 3/3 | curadoria deliberada |
| regra | morfologico-regra-ossos-longos-bilaterais | 95 | 3/3 | curadoria deliberada / fonte viva |
| regra | morfologico-regra-proibicoes-termos | 95 | 3/3 | curadoria deliberada |
| regra | morfologico-regra-preservar-terminologia-do-medico | 94 | 3/3 | curadoria deliberada |
| regra | morfologico-regra-unidades-biometria-fetal | 93 | 3/3 | curadoria deliberada |
| regra | morfologico-regra-placenta-por-idade-gestacional | 90 | 3/3 | manter; fonte viva |
| regra | morfologico-regra-dados-incompletos | 75 | 3/3 | manter; fonte viva |
| regra | morfologico-regra-doppler-acessorio | 75 | 3/3 | manter; fonte viva + rota morfo+Doppler |
| regra | morfologico-regra-peso-fetal-percentil | 75 | 3/3 | manter; regra obstétrica compartilhada |
| regra | morfologico-regra-gestacao-gemelar | 70 | 3/3 | manter; fonte viva |

## Classificação dos drifts

| Bloco/grupo | Classificação | Decisão proposta |
|---|---|---|
| `morfologico-modelo-template-1t`, `2t`, `3t`: fragmentos "TEMPLATE..." e "REGRAS DE PREENCHIMENTO" dentro do modelo | REESCRITA-SUSPEITA | modelo deve ser só a máscara verbatim; seleção e proibições ficam em regra/seletor |
| `morfologico-regra-selecao-automatica-trimestre` | CURADORIA-DELIBERADA temporária | preservar até seletor determinístico virar código; depois pode arquivar |
| `morfologico-regra-dias-da-ig-omitir-quando-zero` | CURADORIA-DELIBERADA | preservar |
| `morfologico-regra-liquido-amniotico-marcadores` | CURADORIA-DELIBERADA | preservar |
| `morfologico-regra-correcoes-transcricao` | CURADORIA-DELIBERADA | preservar |
| `morfologico-regra-dum-primeiraUSG-opcional` | CURADORIA-DELIBERADA | preservar |
| `morfologico-regra-ossos-longos-bilaterais` | CURADORIA-DELIBERADA / FONTE | preservar; regra crítica para não deixar lado contralateral em branco |
| `morfologico-regra-proibicoes-termos` | CURADORIA-DELIBERADA | preservar; vem de negativePrompting + fonte |
| `morfologico-regra-preservar-terminologia-do-medico` | CURADORIA-DELIBERADA | preservar |
| `morfologico-regra-unidades-biometria-fetal` | CURADORIA-DELIBERADA | preservar |
| `morfologico-regra-placenta-por-idade-gestacional` | DUPLICATA PARCIAL | manter; fonte viva útil e sem contrato TS |
| `morfologico-regra-dados-incompletos` | DUPLICATA PARCIAL | manter; sem contrato TS |
| `morfologico-regra-doppler-acessorio` | CURADORIA/FONTE | manter; protege morfológico com Doppler |
| `morfologico-regra-peso-fetal-percentil` | CURADORIA COMPARTILHADA | manter; guard de peso fetal depende da lógica |
| `morfologico-regra-gestacao-gemelar` | FONTE / CURADORIA | manter |

Entradas de allowlist propostas:

```json
[
  {
    "category": "MORFOLOGICO",
    "blockTitle": "morfologico-regra-selecao-automatica-trimestre",
    "reason": "Curadoria/fonte viva: selecao de template 1T/2T/3T ate virar seletor deterministico em codigo."
  },
  {
    "category": "MORFOLOGICO",
    "blockTitle": "morfologico-regra-dias-da-ig-omitir-quando-zero",
    "reason": "Curadoria mobile cross-category: conclusao sem zero dias/placeholders."
  },
  {
    "category": "MORFOLOGICO",
    "blockTitle": "morfologico-regra-liquido-amniotico-marcadores",
    "reason": "Curadoria mobile: protocolo corpo vs conclusao para ILA/MBV."
  },
  {
    "category": "MORFOLOGICO",
    "blockTitle": "morfologico-regra-correcoes-transcricao",
    "reason": "Curadoria mobile para erros de transcricao."
  },
  {
    "category": "MORFOLOGICO",
    "blockTitle": "morfologico-regra-dum-primeiraUSG-opcional",
    "reason": "Curadoria mobile: matriz de omissao/inclusao de DUM e primeira USG."
  },
  {
    "category": "MORFOLOGICO",
    "blockTitle": "morfologico-regra-ossos-longos-bilaterais",
    "reason": "Curadoria mobile/fonte viva: repetir valor bilateral quando medico dita apenas um lado."
  },
  {
    "category": "MORFOLOGICO",
    "blockTitle": "morfologico-regra-proibicoes-termos",
    "reason": "Curadoria mobile: proibicoes terminologicas e estruturas fora do template."
  },
  {
    "category": "MORFOLOGICO",
    "blockTitle": "morfologico-regra-preservar-terminologia-do-medico",
    "reason": "Curadoria mobile: preservar vocabulario ditado."
  },
  {
    "category": "MORFOLOGICO",
    "blockTitle": "morfologico-regra-unidades-biometria-fetal",
    "reason": "Curadoria mobile: unidades de biometria fetal."
  },
  {
    "category": "MORFOLOGICO",
    "blockTitle": "morfologico-regra-doppler-acessorio",
    "reason": "Fonte viva/curadoria: morfologico com Doppler preserva modelo morfologico e adiciona overlay."
  },
  {
    "category": "MORFOLOGICO",
    "blockTitle": "morfologico-regra-peso-fetal-percentil",
    "reason": "Curadoria obstetrica compartilhada: conclusoes por percentil do peso fetal."
  }
]
```

## Variantes conflitantes e seletor determinístico

MORFOLOGICO tem 9 linhas `kind=modelo`, mas são 3 modelos únicos x 3 estilos: 1T, 2T e 3T. Eles nunca devem entrar juntos.

Proposta de seletor:

```ts
MORFOLOGICO: {
  variants: [
    {
      tag: "1t",
      positive: /\b(morfol[oó]gic[oa]\s+(?:do\s+)?(?:primeiro|1[ºo]?)\s*(?:tri|trimestre)|morfo\s*1t|morfo\s*1\s*tri|ccn|transluc[eê]ncia\s+nucal|\\btn\\b|ducto\s+venoso|osso\s+nasal)\b/i,
      negation: /\b(n[aã]o\s+(?:usar|selecionar|gerar)\s+(?:o\s+)?(?:modelo\s+)?1t|n[aã]o\s+e\s+(?:primeiro|1[ºo]?)\s*(?:tri|trimestre))\b/i
    },
    {
      tag: "2t",
      positive: /\b(morfol[oó]gic[oa]\s+(?:do\s+)?(?:segundo|2[ºo]?)\s*(?:tri|trimestre)|morfo\s*2t|morfo\s*2\s*tri)\b/i,
      negation: /\b(n[aã]o\s+(?:usar|selecionar|gerar)\s+(?:o\s+)?(?:modelo\s+)?2t|n[aã]o\s+e\s+(?:segundo|2[ºo]?)\s*(?:tri|trimestre))\b/i
    },
    {
      tag: "3t",
      positive: /\b(morfol[oó]gic[oa]\s+(?:do\s+)?(?:terceiro|3[ºo]?)\s*(?:tri|trimestre)|morfo\s*3t|morfo\s*3\s*tri)\b/i,
      negation: /\b(n[aã]o\s+(?:usar|selecionar|gerar)\s+(?:o\s+)?(?:modelo\s+)?3t|n[aã]o\s+e\s+(?:terceiro|3[ºo]?)\s*(?:tri|trimestre))\b/i
    }
  ],
  numericRule: "IG <=14s0d => 1t; IG 15s0d-28s6d => 2t; IG >=29s0d => 3t",
  fallback: "se disser apenas morfologico e nao houver IG segura, bloquear para 1 pergunta objetiva sobre IG"
}
```

Negação de Doppler é separada do seletor de trimestre. Ex.: "morfológico 2T sem Doppler" ainda seleciona modelo 2T, mas não ativa overlay Doppler.

Referência: `morfologicoRouteSelection.ts` já tem gatilhos validados para detectar exame morfológico e impedir que "morfológico com Doppler" caia em `DOPPLER_OBSTETRICO`. O novo seletor deve ficar depois dessa resolução de categoria, escolhendo só a variante 1T/2T/3T.

## Proposta final manter/arquivar

| Título | Ação | Motivo |
|---|---|---|
| morfologico-modelo-template-1t | MANTER + normalizar | template 1T selecionável |
| morfologico-modelo-template-2t | MANTER + normalizar | template 2T selecionável |
| morfologico-modelo-template-3t | MANTER + normalizar | template 3T selecionável |
| morfologico-regra-selecao-automatica-trimestre | MANTER até seletor em código | sem contrato TS; documenta decisão |
| morfologico-regra-dias-da-ig-omitir-quando-zero | MANTER | IG sem zero dias |
| morfologico-regra-liquido-amniotico-marcadores | MANTER | ILA/MBV |
| morfologico-regra-correcoes-transcricao | MANTER | ditado mobile |
| morfologico-regra-dum-primeiraUSG-opcional | MANTER | DUM/primeira USG |
| morfologico-regra-ossos-longos-bilaterais | MANTER | bilateralidade |
| morfologico-regra-proibicoes-termos | MANTER | termos proibidos |
| morfologico-regra-preservar-terminologia-do-medico | MANTER | fidelidade |
| morfologico-regra-unidades-biometria-fetal | MANTER | unidades |
| morfologico-regra-placenta-por-idade-gestacional | MANTER | placenta por IG |
| morfologico-regra-dados-incompletos | MANTER | pergunta objetiva |
| morfologico-regra-doppler-acessorio | MANTER | overlay Doppler preservando morfológico |
| morfologico-regra-peso-fetal-percentil | MANTER | percentil/peso |
| morfologico-regra-gestacao-gemelar | MANTER | gestação múltipla |

Bundle resultante proposto: 1 modelo selecionado (1T/2T/3T) + 14 regras por enquanto. Depois que houver contrato TS para MORFOLOGICO e seletor em código, `morfologico-regra-selecao-automatica-trimestre` pode ser arquivada.

## Riscos específicos

O maior risco é misturar modelos de trimestre. Com bundle completo sem seletor, o writer vê 1T, 2T e 3T juntos. Isso é exatamente o bug que o DET-2 precisa eliminar.

Outro risco é fallback sem IG. Se o médico disser só "morfológico" e não houver IG/CCN/TN/biometria suficiente, o caminho seguro é bloquear para uma pergunta objetiva, não escolher 2T por default.

Também há risco de Doppler acessório: "morfológico com Doppler" deve manter a anatomia morfológica e só acrescentar `DOPPLERVELOCIMETRIA`. "Morfológico sem Doppler" deve selecionar o trimestre certo e impedir overlay.

Por fim, como não existe contrato hardcoded para MORFOLOGICO, arquivar regra demais aqui é mais perigoso do que em OBSTETRICA. O primeiro saneamento deve ser conservador: selecionar um único modelo, normalizar modelos verbatim, mas manter as regras operacionais.

## Artefatos executáveis para revisão

SQL proposto: `docs/det-2-sql-morfologico.sql`.

Allowlist proposta: `docs/det-2-allowlist-morfologico.json`.

Reusar `resolveMorfologicoCategory(...)` para impedir que "morfológico com Doppler" caia em DOPPLER_OBSTETRICO. Depois disso, aplicar seletor de modelo 1T/2T/3T no bundle:

```ts
MORFOLOGICO: {
  variants: [
    {
      variantTag: "1t",
      trigger:
        /\b(morfol[oó]gic[oa]\s+(?:do\s+)?(?:primeiro|1[ºo]?)\s*(?:tri|trimestre)|morfo\s*1t|morfo\s*1\s*tri|ccn|transluc[eê]ncia\s+nucal|\btn\b|ducto\s+venoso|osso\s+nasal)\b/i,
      negation:
        /\b(n[aã]o\s+(?:usar|selecionar|gerar)\s+(?:o\s+)?(?:modelo\s+)?1t|n[aã]o\s+[ée]\s+(?:primeiro|1[ºo]?)\s*(?:tri|trimestre))\b/i,
    },
    {
      variantTag: "2t",
      trigger:
        /\b(morfol[oó]gic[oa]\s+(?:do\s+)?(?:segundo|2[ºo]?)\s*(?:tri|trimestre)|morfo\s*2t|morfo\s*2\s*tri)\b/i,
      negation:
        /\b(n[aã]o\s+(?:usar|selecionar|gerar)\s+(?:o\s+)?(?:modelo\s+)?2t|n[aã]o\s+[ée]\s+(?:segundo|2[ºo]?)\s*(?:tri|trimestre))\b/i,
    },
    {
      variantTag: "3t",
      trigger:
        /\b(morfol[oó]gic[oa]\s+(?:do\s+)?(?:terceiro|3[ºo]?)\s*(?:tri|trimestre)|morfo\s*3t|morfo\s*3\s*tri)\b/i,
      negation:
        /\b(n[aã]o\s+(?:usar|selecionar|gerar)\s+(?:o\s+)?(?:modelo\s+)?3t|n[aã]o\s+[ée]\s+(?:terceiro|3[ºo]?)\s*(?:tri|trimestre))\b/i,
    },
  ],
  numericRule: "IG <= 14s0d => 1t; IG 15s0d-28s6d => 2t; IG >= 29s0d => 3t",
  dopplerRule:
    "negacao de Doppler nao muda trimestre; apenas impede overlay Doppler acessorio",
  fallback: "sem IG segura => bloquear para 1 pergunta objetiva sobre IG",
}
```

ARTEFATOS DET-2 DEX1 PRONTOS
