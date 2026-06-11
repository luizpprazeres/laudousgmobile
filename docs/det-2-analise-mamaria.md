# DET-2 — Analise de saneamento MAMARIA

> Executado em 2026-06-11 contra o DB mobile, leitura apenas.
> Fonte viva: `/Users/luizprazeres/laudousg/lib/categoryDefaults.ts` (`MAMARIA`) + contrato hardcoded `apps/api/src/server/prompts/contracts/MAMARIA.ts`.
> Comandos rodados: `DIFF_VERBOSE=1 pnpm exec tsx scripts/diff-bundle-vs-original.ts MAMARIA` e SELECT readonly via `pnpm exec tsx` usando `getDbClient`.

## Resultado do diff

`MAMARIA`: 28 blocos unicos, `drift=28`, `gap=3` pelo script oficial. A maior parte do drift vem de curadorias mobile deliberadas, mas ha duas reescritas que merecem trava antes de ligar bundle: modelo "sem axilas" e conclusoes/imagens solidas parametrizadas.

## Inventario DB readonly

| Kind | Titulo | Prio | Estilos | Observacao |
|---|---|---:|---:|---|
| modelo | mamaria-modelo-template-padrao | 100 | 3 | Modelo base com axilas |
| modelo | mamaria-modelo-template-mamas-sem-axilas | 92 | 3 | Variante sem axilas, nao verbatim |
| regra | mamaria-regra-protocolo-e-erros-proibidos | 100 | 3 | Duplica contrato |
| regra | mamaria-regra-titulo-e-estrutura-fixa | 99 | 3 | Duplica contrato |
| regra | mamaria-regra-localizacao-vocabulario-forcado | 95 | 3 | Curadoria/recorte operacional |
| regra | mamaria-regra-medidas-invalidas-localizacao-horario | 95 | 3 | Duplica contrato |
| regra | mamaria-regra-preservar-terminologia-do-medico | 94 | 3 | Curadoria mobile |
| regra | mamaria-regra-frases-normais-quando-omitido | 93 | 3 | Curadoria mobile |
| regra | mamaria-regra-conclusoes-em-itens-separados | 92 | 3 | Duplica contrato |
| regra | mamaria-regra-cisto-simples | 75 | 3 | Duplica contrato/fonte |
| regra | mamaria-regra-multiplos-cistos | 75 | 3 | Duplica contrato/fonte |
| regra | mamaria-regra-nodulo-solido | 75 | 4 | Curadoria com alteracao de margens |
| regra | mamaria-regra-calcificacoes | 70 | 3 | Duplica contrato/fonte |
| regra | mamaria-regra-correlacao-com-mamografia | 70 | 3 | Duplica contrato/fonte |
| regra | mamaria-regra-ginecomastia | 70 | 3 | Duplica contrato/fonte |
| regra | mamaria-regra-linfonodo-intramamario | 70 | 3 | Duplica contrato/fonte |
| regra | mamaria-regra-proteses-mamarias | 70 | 3 | Duplica contrato/fonte |
| frase | mamaria-frase-comentarios-padrao | 90 | 3 | Duplica modelo/contrato |
| frase | mamaria-frase-texto-fundo-padrao | 89 | 3 | Duplica modelo/contrato |
| frase | mamaria-frase-ausencia-de-lesao | 88 | 3 | Duplica modelo/contrato |
| frase | mamaria-frase-texto-axilar-padrao | 70 | 3 | Duplica modelo/contrato |
| conclusao | mamaria-conclusao-axilar-padrao | 70 | 3 | Duplica contrato |
| conclusao | mamaria-conclusao-calcificacoes-linfonodo-ginecomastia | 70 | 3 | Duplica contrato |
| conclusao | mamaria-conclusao-cistos-birads | 70 | 3 | Duplica contrato |
| conclusao | mamaria-conclusao-imagens-solidas-birads | 70 | 4 | Parametrizada; drift deliberado/risco |
| excecao | mamaria-excecao-birads-nao-inferir | 98 | 3 | Duplica contrato, mas bom reforco |
| excecao | mamaria-excecao-rodape-fixo | 97 | 3 | Duplica contrato/modelo |
| excecao | mamaria-excecao-margens-circunscritas-nunca-regulares | 96 | 3 | Curadoria deliberada |

## Classificacao dos fragmentos de drift

| Titulo | Fragmentos | Classe | Decisao |
|---|---:|---|---|
| mamaria-modelo-template-mamas-sem-axilas | 2 | REESCRITA-SUSPEITA | Fonte viva usa titulo dinamico, nao um modelo separado com conclusao "Exame mamario sem evidencia..." |
| mamaria-regra-localizacao-vocabulario-forcado | 2 | DUPLICATA | Conteudo ja esta no contrato; pode arquivar sem perda |
| mamaria-regra-preservar-terminologia-do-medico | 10 | CURADORIA-DELIBERADA | Preservar; propor allowlist por `blockTitle` |
| mamaria-regra-frases-normais-quando-omitido | 8 | CURADORIA-DELIBERADA | Preservar; propor allowlist por `blockTitle` |
| mamaria-regra-nodulo-solido | 1 | CURADORIA-DELIBERADA com risco | Troca "regular" por margens mais apropriadas/circunscritas; exige decisao clinica explicita |
| mamaria-conclusao-imagens-solidas-birads | 3 | CURADORIA-DELIBERADA com risco | Parametriza BI-RADS para nao fixar 3/4A; preservar se regra "nao inferir" for aceita |
| mamaria-excecao-birads-nao-inferir | 1 | DUPLICATA | Ja esta no contrato; pode manter como reforco ou arquivar |
| mamaria-excecao-margens-circunscritas-nunca-regulares | 1 | CURADORIA-DELIBERADA | Preservar se Luiz confirma que "regulares" deve ser proibido em mamaria |

Entradas propostas para `scripts/diff-allowlist.json`, sem aplicar agora: `mamaria-regra-preservar-terminologia-do-medico`, `mamaria-regra-frases-normais-quando-omitido`, `mamaria-regra-nodulo-solido`, `mamaria-conclusao-imagens-solidas-birads`, `mamaria-excecao-margens-circunscritas-nunca-regulares`.

## Variantes conflitantes e seletor deterministico

Ha dois modelos no DB: base com axilas e "mamas sem axilas". A fonte viva, porem, descreve isso como titulo/escopo dinamico, nao necessariamente como segunda mascara completa.

| Variante | Modelo | Gatilho positivo | Negacao que deve vencer |
|---|---|---|---|
| `com_axilas` | mamaria-modelo-template-padrao | default, `com axilas`, `regioes axilares avaliadas`, `avaliar axilas`, `inclui axilas` | `sem axilas`, `so mamas`, `somente mamas`, `remover axilas`, `titulo sem regioes axilares` |
| `sem_axilas` | idealmente mesmo template base com titulo/corpo axilar omitido, nao o bloco atual | `sem axilas`, `so mamas`, `somente mamas`, `remover axilas`, `nao avaliar axilas`, `titulo sem axilas` | `com axilas`, `inclua axilas`, `avaliacao axilar realizada` |

Recomendacao: nao usar o bloco atual `mamaria-modelo-template-mamas-sem-axilas` como variante validada sem corrigir, porque ele altera conclusao e nao representa a fonte viva completa.

## Proposta manter/arquivar

| Titulo | Acao proposta | Motivo |
|---|---|---|
| mamaria-modelo-template-padrao | Manter | Modelo base necessario |
| mamaria-modelo-template-mamas-sem-axilas | Arquivar ou recriar | Reescrita suspeita; fonte viva resolve por titulo/escopo dinamico |
| mamaria-regra-preservar-terminologia-do-medico | Manter | Curadoria deliberada |
| mamaria-regra-frases-normais-quando-omitido | Manter | Curadoria deliberada |
| mamaria-regra-nodulo-solido | Manter se Luiz confirmar margens | Diverge da fonte para evitar "regulares"; decisao clinica precisa ficar explicita |
| mamaria-conclusao-imagens-solidas-birads | Manter com allowlist | Evita fixar BI-RADS 3/4A, mas deve preservar "nao inferir" |
| mamaria-excecao-margens-circunscritas-nunca-regulares | Manter se confirmado | Mesmo motivo da regra de nodulo |
| mamaria-excecao-birads-nao-inferir | Opcional manter | Duplica contrato, mas e seguranca critica |
| Demais regras/frases/conclusoes | Arquivar | Duplicam contrato/modelo |

Composicao resultante do bundle: modelo base + seletor de escopo axilar + 4 a 5 blocos de curadoria. O modelo sem axilas atual nao deve entrar no bundle sem saneamento de conteudo.

## Riscos especificos

O primeiro risco e o sistema trocar "sem axilas" por um modelo que muda a conclusao normal. O segundo e a divergencia "margem regular" versus "margem circunscrita": isso parece clinicamente deliberado, mas precisa virar decisao documentada. O terceiro e BI-RADS: qualquer regra parametrizada precisa continuar proibindo inferencia quando o medico nao ditou a categoria.

## Artefatos executaveis para revisao

- SQL: `docs/det-2-sql-mamaria.sql`
- Allowlist: `docs/det-2-allowlist-mamaria.json`

## Entrada proposta para MODELO_VARIANT_SELECTORS

Recomendacao: nao criar variante por `kind=modelo` nesta fase. Depois do saneamento, deve sobrar apenas `mamaria-modelo-template-padrao`; o escopo axilar deve ser tratado como comando/roteamento dentro do contrato, nao como segundo modelo conflitante. Assim o bundle nao tera modelos conflitantes.

Se a decisao for manter uma variante `sem_axilas` em DET-3, a proposta seria:

```ts
MAMARIA: {
  variantTag: "sem-axilas",
  trigger: /\b(?:sem\s+axilas?|s[oó]\s+mamas?|somente\s+mamas?|remover\s+axilas?|n[aã]o\s+avaliar\s+axilas?|t[ií]tulo\s+sem\s+(?:regi[oõ]es\s+)?axilares?)\b/i,
  negation: /\b(?:com\s+axilas?|inclu(?:a|ir)\s+axilas?|avali(?:ar|a[cç][aã]o)\s+axilar(?:es)?|regi[oõ]es\s+axilares\s+avaliadas)\b/i,
}
```

Default: `com_axilas`, usando o modelo padrao. Para DET-2, minha proposta e nao ativar esse selector ainda porque o bloco `mamaria-modelo-template-mamas-sem-axilas` deve ser arquivado.

ARTEFATOS DET-2 DEX2 PRONTOS
