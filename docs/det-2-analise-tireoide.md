# DET-2 — Analise de saneamento TIREOIDE

> Executado em 2026-06-11 contra o DB mobile, leitura apenas.
> Fonte viva: `/Users/luizprazeres/laudousg/lib/categoryDefaults.ts` (`TIREOIDE`) + contrato hardcoded `apps/api/src/server/prompts/contracts/TIREOIDE.ts`.
> Comandos rodados: `DIFF_VERBOSE=1 pnpm exec tsx scripts/diff-bundle-vs-original.ts TIREOIDE` e SELECT readonly via `pnpm exec tsx` usando `getDbClient`.

## Resultado do diff

`TIREOIDE`: 22 blocos unicos, `drift=50`, `gap=0` pelo script oficial. O drift nao e ausencia de fonte; e excesso de blocos reescritos/duplicados sobre um contrato hardcoded que ja contem quase todo o protocolo.

## Inventario DB readonly

| Kind | Titulo | Prio | Estilos | Observacao |
|---|---|---:|---:|---|
| modelo | tireoide-modelo-template-padrao | 100 | 3 | Modelo base sem Doppler |
| modelo | tireoide-modelo-template-com-doppler | 95 | 3 | Variante Doppler; drift contra fonte viva |
| regra | tireoide-regra-estrutura-fixa | 99 | 3 | Duplica contrato |
| regra | tireoide-regra-titulo-com-doppler | 98 | 3 | Duplica contrato |
| regra | tireoide-regra-preservar-terminologia-do-medico | 94 | 3 | Curadoria mobile |
| regra | tireoide-regra-frases-normais-quando-omitido | 93 | 3 | Curadoria mobile |
| regra | tireoide-regra-grafia-istmo-sem-acento | 90 | 3 | Duplica contrato |
| regra | tireoide-regra-repetir-frase-completa-por-segmento | 88 | 3 | Duplica contrato |
| regra | tireoide-regra-nodulos-com-classificacao | 78 | 3 | Reescrita extensa do trecho de nodulos |
| regra | tireoide-regra-doppler-informado | 70 | 3 | Duplica contrato |
| regra | tireoide-regra-linfonodos-cervicais | 60 | 3 | Reescrita deliberada para evitar linfonodos padrao |
| frase | tireoide-frase-comentarios-fixo | 90 | 3 | Duplica contrato |
| frase | tireoide-frase-lobos-e-istmo-normal | 85 | 3 | Duplica contrato/modelo |
| frase | tireoide-frase-descritores-de-nodulo | 75 | 3 | Reescrita/resumo de descritores |
| frase | tireoide-frase-pico-sistolico-tireoidiana | 70 | 3 | Duplica contrato |
| frase | tireoide-frase-linfonodos-cervicais-preservados | 60 | 3 | Duplica contrato, mas pode conflitar com regra de omitir |
| conclusao | tireoide-conclusao-volume-total-normal | 90 | 3 | Duplica contrato/modelo |
| conclusao | tireoide-conclusao-linfonodos-cervicais | 60 | 3 | Duplica contrato, conflito potencial |
| excecao | tireoide-excecao-classificacoes-nao-calcular | 97 | 3 | Duplica contrato |
| excecao | tireoide-excecao-rodape-fixo | 96 | 3 | Duplica contrato/modelo |
| excecao | tireoide-excecao-linfonodos-normais-no-corpo-nao-conclusao | 92 | 3 | Curadoria deliberada |
| comentario_tecnico | tireoide-comentario_tecnico-recomendacoes-acr-tirads-2017 | 70 | 3 | Conteudo extra, nao vem da fonte viva |

## Classificacao dos fragmentos de drift

| Titulo | Fragmentos | Classe | Decisao |
|---|---:|---|---|
| tireoide-modelo-template-com-doppler | 4 | REESCRITA-SUSPEITA | Variante util, mas deveria ser recriada verbatim do `TIREOIDE_MODELO_DOPPLER`; texto atual usa A/B/C/X e nao bate com fonte/modelo hardcoded |
| tireoide-regra-preservar-terminologia-do-medico | 10 | CURADORIA-DELIBERADA | Preservar; propor allowlist por `blockTitle` |
| tireoide-regra-frases-normais-quando-omitido | 8 | CURADORIA-DELIBERADA | Preservar; propor allowlist por `blockTitle` |
| tireoide-regra-grafia-istmo-sem-acento | 1 | DUPLICATA | Ja esta no contrato |
| tireoide-regra-repetir-frase-completa-por-segmento | 1 | DUPLICATA | Ja esta no contrato |
| tireoide-regra-nodulos-com-classificacao | 14 | CURADORIA-DELIBERADA com risco | Preserva formato operacional, mas precisa allowlist explicita; nao e verbatim |
| tireoide-regra-linfonodos-cervicais | 7 | CURADORIA-DELIBERADA | Preservar porque corrige comportamento perigoso: linfonodos nao sao padrao se nao ditados |
| tireoide-frase-descritores-de-nodulo | 2 | DUPLICATA | Subconjunto/resumo da regra de nodulos |
| tireoide-excecao-linfonodos-normais-no-corpo-nao-conclusao | 1 | CURADORIA-DELIBERADA | Preservar; reforca omissao de conclusao |
| tireoide-comentario_tecnico-recomendacoes-acr-tirads-2017 | 2 | REESCRITA-SUSPEITA | Conteudo normativo novo; nao deve entrar no bundle deterministico sem decisao clinica formal |

Entradas propostas para `scripts/diff-allowlist.json`, sem aplicar agora: `tireoide-regra-preservar-terminologia-do-medico`, `tireoide-regra-frases-normais-quando-omitido`, `tireoide-regra-nodulos-com-classificacao`, `tireoide-regra-linfonodos-cervicais`, `tireoide-excecao-linfonodos-normais-no-corpo-nao-conclusao`.

## Variantes conflitantes e seletor deterministico

Ha dois modelos: padrao e com Doppler. Eles nao devem entrar juntos.

| Variante | Modelo | Gatilho positivo | Negacao que deve vencer |
|---|---|---|---|
| `padrao` | tireoide-modelo-template-padrao | default quando nao ha Doppler positivo | `sem Doppler`, `Doppler nao realizado`, `nao foi feito Doppler`, `nao foi realizada avaliacao Doppler`, `sem avaliacao Doppler` |
| `doppler` | tireoide-modelo-template-com-doppler | `Doppler`, `com Doppler`, `pico sistolico`, `arteria tireoidiana inferior`, `vascularizacao ao Doppler` | mesmas negacoes acima |

Regex positiva simples como `/doppler/i` sozinha e insegura. Precisa aceitar "Doppler nao foi realizado" como negacao, igual o furo encontrado no DET-1 para abdome.

## Proposta manter/arquivar

| Titulo | Acao proposta | Motivo |
|---|---|---|
| tireoide-modelo-template-padrao | Manter | Modelo base necessario |
| tireoide-modelo-template-com-doppler | Manter apos correcao verbatim | Variante necessaria, mas conteudo atual e reescrita suspeita |
| tireoide-regra-preservar-terminologia-do-medico | Manter | Curadoria deliberada |
| tireoide-regra-frases-normais-quando-omitido | Manter | Curadoria deliberada |
| tireoide-regra-nodulos-com-classificacao | Manter com allowlist | Curadoria operacional para formato de conclusao; revisar clinicamente antes da flag |
| tireoide-regra-linfonodos-cervicais | Manter | Evita inserir linfonodos como padrao |
| tireoide-excecao-linfonodos-normais-no-corpo-nao-conclusao | Manter | Reforco de seguranca |
| tireoide-comentario_tecnico-recomendacoes-acr-tirads-2017 | Arquivar | Normativo extra fora da fonte viva; pode induzir recomendacao nao ditada |
| Demais frases/regras/conclusoes | Arquivar | Duplicam contrato/modelo |

Composicao resultante do bundle: 1 modelo selecionado (`padrao` ou `doppler`) + 5 blocos de curadoria. O comentario tecnico ACR-TIRADS deve ficar fora ate virar decisao clinica explicita.

## Riscos especificos

O risco principal e misturar modelo sem Doppler com Doppler: isso muda titulo, vascularizacao e picos sistolicos. O segundo risco e linfonodos cervicais aparecerem como padrao quando nao foram ditados; os blocos de curadoria devem vencer as frases antigas. O terceiro risco e recomendacao ACR-TIRADS ser emitida por iniciativa do prompt, sem o medico pedir.

## Artefatos executaveis para revisao

- SQL: `docs/det-2-sql-tireoide.sql`
- Allowlist: `docs/det-2-allowlist-tireoide.json`

## Entrada proposta para MODELO_VARIANT_SELECTORS

```ts
TIREOIDE: {
  variantTag: "doppler",
  trigger: /\b(?:doppler|pico\s+sist[oó]lico|art[eé]ria\s+tireoidiana\s+inferior|vasculariza[cç][aã]o\s+ao\s+doppler)\b/i,
  negation: /\b(?:(?:sem|aus[eê]ncia\s+de)\s+(?:avalia[cç][aã]o\s+)?doppler|doppler\s+n[aã]o\s+(?:foi\s+)?(?:realizad[ao]|feito)|n[aã]o\s+(?:foi\s+)?(?:realizad[ao]|feito)\s+(?:avalia[cç][aã]o\s+)?doppler|n[aã]o\s+(?:incluir|usar|colocar|fazer|realizar)\s+(?:o\s+)?doppler)/i,
}
```

Default: sem gatilho positivo, ou com negacao positiva detectada, fica `tireoide-modelo-template-padrao`. Se gatilho positivo sem negacao, entra apenas `tireoide-modelo-template-com-doppler`.

ARTEFATOS DET-2 DEX2 PRONTOS
