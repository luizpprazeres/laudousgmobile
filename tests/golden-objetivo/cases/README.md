# Golden cases — Modo Objetivo

Os 20 casos cobrem laudos normais e patológicos com achados críticos explícitos.
O runner executa cada caso no estilo `OBJETIVO` e no baseline
`DETALHADO_PROTOCOLAR`, valida os três cabeçalhos, preservação dos achados,
ausência de padrões proibidos e razão máxima de comprimento.

Distribuição: 4 obstétricos, 3 abdome total, 3 tireoide, 2 mamária, 2 pelve
feminina, 2 Doppler obstétrico, 2 morfológico, 1 Doppler renal e 1 cervical.

## Schema do caso JSON

```jsonc
{
  "id": "tireoide-multinodular-01",
  "category": "TIREOIDE",
  "rawInput": "Tireoide com múltiplos nódulos no lobo direito: nódulo 1 sólido hipoecoico de 8 mm, nódulo 2 cístico de 4 mm...",
  "expectedHeaders": ["TÉCNICA", "ANÁLISE", "OPINIÃO DO RELATÓRIO"],
  "criticalFindings": ["lobo direito", "8 mm", "4 mm"],
  "forbiddenPatterns": ["Os seguintes aspectos foram observados", "COMENTÁRIOS:"],
  "maxLengthRatio": 1.0,
  // Critérios novos (opt-in):
  "requiresEnumeration": true,        // exige itens "1-", "2-", "3-" no output
  "minEnumeratedItems": 2,             // quantidade mínima (default = 2)
  "forbiddenProseConjunctions": [      // regex case-insensitive
    "apresentando.{1,40}medindo",      // "...apresentando ... medindo ..." = prose
    "classificado como",
    "que se caracteriza por"
  ]
}
```

## Critérios de PASS (todos têm que passar)

1. **Headers** — todos os `expectedHeaders` presentes (case/diacritic-insensitive)
2. **Findings** — todos os `criticalFindings` preservados (com aliases pra medidas e termos clínicos)
3. **Forbidden patterns** — nenhum dos `forbiddenPatterns` no output
4. **Length ratio** — `objectiveOutput / baselineOutput ≤ maxLengthRatio` (calibrado por categoria; padrão 0.7)
5. **Enumeração** *(opt-in)* — se `requiresEnumeration: true`, output deve ter `≥ minEnumeratedItems` linhas no formato `\d+[-.]`/`\d+\)`
6. **Conjunções prosaicas** *(opt-in)* — nenhum dos `forbiddenProseConjunctions` (regex) no output

## Execução

```bash
GOLDEN_AUTH_TOKEN=<jwt-de-teste> pnpm validate:golden:objetivo
```

Filtros opcionais:
```bash
GOLDEN_CASE_FILTER=tireoide pnpm validate:golden:objetivo  # roda só cases contendo "tireoide" no nome
GOLDEN_API_URL=http://localhost:3000 pnpm validate:golden:objetivo  # aponta pra dev local
```

Cada caso faz duas gerações: `OBJETIVO` e `DETALHADO_PROTOCOLAR`. O relatório
HTML é sobrescrito em `tests/golden-objetivo/report.html`.

## Calibração de maxLengthRatio por categoria

Categorias naturalmente concisas (Tireoide nodular único, Cervical, Mamária
single-finding) podem precisar `maxLengthRatio` mais alto (0.95–1.2). Em vez
de mascarar, prefira calibrar caso a caso ou usar critérios 5/6 (enumeração)
que medem **estrutura**, não comprimento.
