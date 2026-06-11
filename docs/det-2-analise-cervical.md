# DET-2 — Analise de saneamento CERVICAL

> Executado em 2026-06-11 contra o DB mobile, leitura apenas.
> Fonte viva: `/Users/luizprazeres/laudousg/lib/categoryDefaults.ts` (`CERVICAL`). Nao existe contrato hardcoded para `CERVICAL` em `apps/api/src/server/prompts/contracts/index.ts`.
> Comandos rodados: `DIFF_VERBOSE=1 pnpm exec tsx scripts/diff-bundle-vs-original.ts CERVICAL` e SELECT readonly via `pnpm exec tsx` usando `getDbClient`.

## Resultado do diff

`CERVICAL`: 8 blocos unicos, `drift=132`, `gap=8`. Esse e o caso mais problematico da onda: o bundle atual nao e extracao do LaudoUSG original. Ele foi reescrito com referencias AIUM/Robbins/AAO-HNS e nao cobre a fonte viva simples do original.

## Inventario DB readonly

| Kind | Titulo | Prio | Estilos | Observacao |
|---|---|---:|---:|---|
| modelo | cervical-modelo-template-padrao | 95 | 4 | Reescrita extensa; titulo diferente da fonte viva |
| regra | cervical-regra-criterios-linfonodo-normal-vs-suspeito | 80 | 4 | Conteudo normativo externo |
| regra | cervical-regra-niveis-cervicais-robbins | 80 | 4 | Conteudo normativo externo |
| regra | cervical-regra-medidas-padrao | 75 | 4 | Conteudo normativo externo |
| conclusao | cervical-conclusao-linfonodo-suspeito-malignidade | 85 | 4 | Conteudo normativo externo |
| conclusao | cervical-conclusao-exame-normal | 80 | 4 | Diverge da conclusao original |
| conclusao | cervical-conclusao-linfadenopatia-reacional | 80 | 4 | Conteudo normativo externo |
| excecao | cervical-excecao-massa-cervical-cistica-adulto | 85 | 4 | Conteudo normativo externo |

## Classificacao dos fragmentos de drift

| Titulo | Fragmentos | Classe | Decisao |
|---|---:|---|---|
| cervical-modelo-template-padrao | 18 | REESCRITA-SUSPEITA | Arquivar para DET-2; nao e a mascara original |
| cervical-regra-criterios-linfonodo-normal-vs-suspeito | 15 | REESCRITA-SUSPEITA | Arquivar; conteudo externo nao aprovado como fonte viva |
| cervical-regra-niveis-cervicais-robbins | 16 | REESCRITA-SUSPEITA | Arquivar; fonte original so exige listar niveis IA-VI |
| cervical-regra-medidas-padrao | 20 | REESCRITA-SUSPEITA | Arquivar; fonte original usa `___ x ___ x ___ cm`, nao eixo curto/longo em mm |
| cervical-conclusao-linfonodo-suspeito-malignidade | 18 | REESCRITA-SUSPEITA | Arquivar; conclusao original e curta: "Linfonodo de aspecto suspeito..." |
| cervical-conclusao-exame-normal | 13 | REESCRITA-SUSPEITA | Arquivar; conclusao original e "Ausencia de alteracoes detectaveis pelo metodo." |
| cervical-conclusao-linfadenopatia-reacional | 13 | REESCRITA-SUSPEITA | Arquivar; nao existe na fonte viva |
| cervical-excecao-massa-cervical-cistica-adulto | 19 | REESCRITA-SUSPEITA | Arquivar; conteudo AAO-HNS novo e fora da fonte viva |

Nao proponho allowlist para Cervical nesta fase. Se Luiz quiser preservar esse conteudo medico mais rico, ele deve virar curadoria clinica deliberada em sprint separado, porque hoje ele substitui a mascara viva em vez de apenas complementar.

## Gaps da fonte viva

O diff acusou 8 gaps, todos essenciais:

| Gap | Conteudo ausente do bundle atual |
|---|---|
| funcao | Gerar laudos de ultrassonografia cervical seguindo modelo e regras |
| regras gerais | Estrutura fixa com `ULTRASSONOGRAFIA CERVICAL` e obrigacao de listar todos os niveis IA, IB, IIA, IIB, III, IV, VA, VB e VI |
| comentarios | Transdutor de 12 MHz, avaliacao das cadeias ganglionares cervicais, documentacao fotografica |
| corpo normal | Cadeias ganglionares sem alteracoes nos niveis IA-VI |
| conclusao normal | Ausencia de alteracoes detectaveis pelo metodo |
| linfonodos normais por nivel | Frase padrao de linfonodos normais no nivel informado |
| demais niveis | Ausencia de alteracoes nos demais niveis avaliados |
| linfonodo suspeito | Frase curta de achado e conclusao com correlacao clinica |

## Variantes conflitantes e seletor deterministico

Nao ha variantes legitimas na fonte viva de `CERVICAL`. O DB tem apenas um modelo unico repetido em 4 estilos, mas esse modelo e uma reescrita suspeita.

Proposta: `CERVICAL` deve ter uma unica variante `padrao`, sem seletor textual. Se no futuro houver variantes "mapeamento completo Robbins" ou "massa cervical adulto", isso precisa ser DET-3/curadoria explicita, nao DET-2.

## Proposta manter/arquivar

| Titulo | Acao proposta | Motivo |
|---|---|---|
| cervical-modelo-template-padrao | Arquivar e recriar verbatim | Mascara atual diverge da fonte viva |
| cervical-regra-criterios-linfonodo-normal-vs-suspeito | Arquivar | Conteudo externo nao presente na fonte viva |
| cervical-regra-niveis-cervicais-robbins | Arquivar | Conteudo externo nao presente na fonte viva |
| cervical-regra-medidas-padrao | Arquivar | Conteudo externo e unidade diferente |
| cervical-conclusao-linfonodo-suspeito-malignidade | Arquivar | Reescrita longa da conclusao original |
| cervical-conclusao-exame-normal | Arquivar | Reescrita da conclusao original |
| cervical-conclusao-linfadenopatia-reacional | Arquivar | Nao existe na fonte viva |
| cervical-excecao-massa-cervical-cistica-adulto | Arquivar | Nao existe na fonte viva |

Composicao resultante proposta: recriar do zero, a partir da fonte viva, com 1 modelo `cervical-modelo-template-padrao` verbatim + regras minimas separadas apenas se forem trechos literais do original. Bundle atual nao deveria ser ligado na flag deterministica.

## Riscos especificos

Cervical tem risco alto de mudar o produto sem perceber: o prompt atual transforma uma categoria simples do original em protocolo de cabeca/pescoco com Robbins, criterios de malignidade e recomendacoes. Isso pode ser melhor clinicamente em alguns cenarios, mas nao e "saneamento da fonte viva". Tambem ha risco de unidade: fonte original usa cm em `___ x ___ x ___ cm`; bundle atual empurra mm/eixo curto/eixo longo.

## Artefatos executaveis para revisao

- SQL: `docs/det-2-sql-cervical.sql`
- Allowlist: `docs/det-2-allowlist-cervical.json`

## Entrada proposta para MODELO_VARIANT_SELECTORS

Nao propor selector para `CERVICAL` no DET-2. Depois do saneamento, deve existir uma unica variante `padrao`, sem conflito entre modelos. O bundle deve carregar apenas o modelo semeado da fonte viva:

```ts
// CERVICAL: sem entrada em MODELO_VARIANT_SELECTORS no DET-2.
// Variante unica: cervical-modelo-template-padrao.
```

ARTEFATOS DET-2 DEX2 PRONTOS
