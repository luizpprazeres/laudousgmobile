# DET-2 — Análise de saneamento DOPPLER_OBSTETRICO

> Executado em 2026-06-11 contra o DB mobile (`yldtkqrsbgcnwlydrrot`), via `getDbClient` em consulta SELECT-only.
> Fonte viva: `~/laudousg/lib/categoryDefaults.ts` (`DOPPLER_OBSTETRICO`) + contrato hardcoded em `apps/api/src/server/prompts/contracts/DOPPLER_OBSTETRICO.ts`.
> Sem mudanças de DB/código neste arquivo.

## Evidência rodada

Comando oficial:

```bash
DIFF_VERBOSE=1 pnpm exec tsx scripts/diff-bundle-vs-original.ts DOPPLER_OBSTETRICO
```

Resultado:

```text
DOPPLER_OBSTETRICO: 28 blocos únicos | drift=194 gap=2
GAPs principais:
- extração de imagens incluindo Doppler e cálculo de IP médio
- regras específicas de placenta anterior e ossos longos em morfológicos
```

Leitura do DB foi feita com `pnpm exec tsx` usando `getDbClient` de `packages/db/src/client`, apenas SELECT.

## Inventário dos blocos validated

| Kind | Título | Prio | Linhas/estilos | Classificação |
|---|---|---:|---:|---|
| modelo | doppler-obstetrico-modelo-template-padrao | 100 | 3/3 | manter; único modelo real |
| regra | doppler-obstetrico-regra-funcao-e-extracao | 99 | 3/3 | duplicata do contrato, mas contrato ainda não é injetado no clássico |
| regra | doppler-obstetrico-regra-ordem-secoes | 99 | 3/3 | curadoria deliberada |
| regra | doppler-obstetrico-regra-conclusao-ig-sem-zero-dias | 96 | 3/3 | duplicata da regra dias-da-ig |
| regra | doppler-obstetrico-regra-dias-da-ig-omitir-quando-zero | 96 | 3/3 | curadoria deliberada |
| regra | doppler-obstetrico-regra-liquido-amniotico-marcadores | 96 | 3/3 | curadoria deliberada |
| regra | doppler-obstetrico-regra-correcoes-transcricao | 95 | 3/3 | curadoria deliberada |
| regra | doppler-obstetrico-regra-dum-primeiraUSG-opcional | 95 | 3/3 | curadoria deliberada |
| regra | doppler-obstetrico-regra-ip-medio-uterinas-auto-calculo | 95 | 3/3 | curadoria deliberada |
| regra | doppler-obstetrico-regra-percentis-opcionais | 95 | 3/3 | curadoria deliberada |
| regra | doppler-obstetrico-regra-preservar-terminologia-do-medico | 94 | 3/3 | curadoria deliberada |
| regra | doppler-obstetrico-regra-frases-normais-quando-omitido | 93 | 3/3 | curadoria deliberada |
| regra | doppler-obstetrico-regra-unidades-biometria-fetal | 93 | 3/3 | curadoria deliberada |
| regra | doppler-obstetrico-regra-dados-incompletos | 91 | 3/3 | manter; fonte viva |
| regra | doppler-obstetrico-regra-peso-fetal-percentil | 75 | 3/3 | manter; fonte viva + operacional |
| regra | doppler-obstetrico-regra-placenta-por-idade-gestacional | 75 | 3/3 | manter; fonte viva |
| regra | doppler-obstetrico-regra-gestacao-gemelar | 70 | 3/3 | manter; fonte viva |
| regra | doppler-obstetrico-regra-ip-medio-uterinas-percentil | 70 | 3/3 | manter; fonte viva |
| regra | doppler-obstetrico-regra-ossos-longos-morfologico | 70 | 3/3 | arquivar quando morfológico+Doppler rotear para MORFOLOGICO |
| frase | doppler-obstetrico-frase-comentarios-padrao | 90 | 3/3 | duplicata do modelo |
| frase | doppler-obstetrico-frase-apresentacao-vitalidade-anatomia | 89 | 3/3 | duplicata do modelo |
| frase | doppler-obstetrico-frase-biometria-fetal | 88 | 3/3 | duplicata do modelo |
| frase | doppler-obstetrico-frase-dopplervelocimetria | 87 | 3/3 | duplicata do modelo |
| conclusao | doppler-obstetrico-conclusao-conclusao-normal | 90 | 3/3 | duplicata do modelo |
| conclusao | doppler-obstetrico-conclusao-peso-fetal-percentil | 80 | 3/3 | duplicata da regra peso fetal |
| conclusao | doppler-obstetrico-conclusao-ip-medio-uterinas | 70 | 3/3 | duplicata da regra IP uterinas |
| excecao | doppler-obstetrico-excecao-percentis-omitidos | 98 | 3/3 | duplicata da regra percentis opcionais |
| excecao | doppler-obstetrico-excecao-marcadores-liquido-amniotico | 97 | 3/3 | duplicata da regra líquido amniótico |

## Classificação dos drifts

| Bloco/grupo | Classificação | Decisão proposta |
|---|---|---|
| `doppler-obstetrico-modelo-template-padrao` | REESCRITA-SUSPEITA leve | manter, mas revisar para ficar verbatim da fonte; regra de IG não deve ser comentário embutido no modelo |
| `doppler-obstetrico-regra-funcao-e-extracao` | DUPLICATA CONDICIONAL | arquivar só depois de promover `DOPPLER_OBSTETRICO_CONTRACT` para todos os estilos; hoje o contrato só entra no OBJETIVO |
| `doppler-obstetrico-regra-ordem-secoes` | CURADORIA-DELIBERADA | preservar; estrutura de Doppler é sensível a posição da seção DOPPLERVELOCIMETRIA |
| `doppler-obstetrico-regra-conclusao-ig-sem-zero-dias` | DUPLICATA | arquivar; manter `regra-dias-da-ig-omitir-quando-zero` como canonical |
| `doppler-obstetrico-regra-dias-da-ig-omitir-quando-zero` | CURADORIA-DELIBERADA | preservar; mesma regra cross-category validada |
| `doppler-obstetrico-regra-liquido-amniotico-marcadores` | CURADORIA-DELIBERADA | preservar; corpo vs conclusão |
| `doppler-obstetrico-regra-correcoes-transcricao` | CURADORIA-DELIBERADA | preservar; inclui atalhos AU/ACM/DV/VU/IP/IR |
| `doppler-obstetrico-regra-dum-primeiraUSG-opcional` | CURADORIA-DELIBERADA | preservar |
| `doppler-obstetrico-regra-ip-medio-uterinas-auto-calculo` | CURADORIA-DELIBERADA | preservar; comportamento operacional do iOS/calculadora |
| `doppler-obstetrico-regra-percentis-opcionais` | CURADORIA-DELIBERADA | preservar; evita placeholders/invenção de percentis |
| `doppler-obstetrico-regra-preservar-terminologia-do-medico` | CURADORIA-DELIBERADA | preservar |
| `doppler-obstetrico-regra-frases-normais-quando-omitido` | CURADORIA-DELIBERADA | preservar |
| `doppler-obstetrico-regra-unidades-biometria-fetal` | CURADORIA-DELIBERADA | preservar |
| `doppler-obstetrico-regra-dados-incompletos` | DUPLICATA PARCIAL | manter até contrato ser injetado nos estilos clássicos |
| `doppler-obstetrico-regra-peso-fetal-percentil` | DUPLICATA PARCIAL | manter; regra operacional mais detalhada que o contrato |
| `doppler-obstetrico-regra-placenta-por-idade-gestacional` | DUPLICATA PARCIAL | manter; fonte viva pequena e útil |
| `doppler-obstetrico-regra-gestacao-gemelar` | DUPLICATA PARCIAL | manter; fonte viva detalhada |
| `doppler-obstetrico-regra-ip-medio-uterinas-percentil` | DUPLICATA PARCIAL | manter; regra clínica específica |
| `doppler-obstetrico-regra-ossos-longos-morfologico` | DUPLICATA / VAZAMENTO CROSS-CATEGORY | arquivar depois que morfológico+Doppler sempre usar MORFOLOGICO + overlay |
| `doppler-obstetrico-frase-*` | DUPLICATA | arquivar; fragmentos do modelo |
| `doppler-obstetrico-conclusao-*` | DUPLICATA | arquivar; conteúdo já no modelo ou regra |
| `doppler-obstetrico-excecao-*` | DUPLICATA | arquivar; conteúdo já em regras canonical |

Entradas de allowlist propostas:

```json
[
  {
    "category": "DOPPLER_OBSTETRICO",
    "blockTitle": "doppler-obstetrico-regra-ordem-secoes",
    "reason": "Curadoria mobile: garante DOPPLERVELOCIMETRIA antes da CONCLUSAO."
  },
  {
    "category": "DOPPLER_OBSTETRICO",
    "blockTitle": "doppler-obstetrico-regra-dias-da-ig-omitir-quando-zero",
    "reason": "Curadoria mobile cross-category: conclusao sem zero dias/placeholders."
  },
  {
    "category": "DOPPLER_OBSTETRICO",
    "blockTitle": "doppler-obstetrico-regra-liquido-amniotico-marcadores",
    "reason": "Curadoria mobile: protocolo corpo vs conclusao para ILA/MBV."
  },
  {
    "category": "DOPPLER_OBSTETRICO",
    "blockTitle": "doppler-obstetrico-regra-ip-medio-uterinas-auto-calculo",
    "reason": "Curadoria mobile: calcula IP medio quando direita+esquerda foram informadas."
  },
  {
    "category": "DOPPLER_OBSTETRICO",
    "blockTitle": "doppler-obstetrico-regra-percentis-opcionais",
    "reason": "Curadoria mobile: percentis apenas quando medico informou ou calculadora estruturada trouxe."
  },
  {
    "category": "DOPPLER_OBSTETRICO",
    "blockTitle": "doppler-obstetrico-regra-correcoes-transcricao",
    "reason": "Curadoria mobile para siglas e erros de transcricao Doppler."
  },
  {
    "category": "DOPPLER_OBSTETRICO",
    "blockTitle": "doppler-obstetrico-regra-preservar-terminologia-do-medico",
    "reason": "Curadoria mobile: preservar IP/IR, lados, diastole e Gratacos."
  },
  {
    "category": "DOPPLER_OBSTETRICO",
    "blockTitle": "doppler-obstetrico-regra-frases-normais-quando-omitido",
    "reason": "Curadoria mobile: defaults qualitativos sem inventar medidas/percentis."
  },
  {
    "category": "DOPPLER_OBSTETRICO",
    "blockTitle": "doppler-obstetrico-regra-unidades-biometria-fetal",
    "reason": "Curadoria mobile: unidades fetais e medidas Doppler adimensionais."
  }
]
```

## Variantes conflitantes e seletor determinístico

DOPPLER_OBSTETRICO tem 3 linhas `kind=modelo`, mas é 1 modelo único x 3 estilos. Não há variante de modelo interna.

O seletor necessário é anterior: a categoria DOPPLER_OBSTETRICO só deve ser escolhida quando Doppler for pedido/feito de forma positiva. Negação precisa ganhar precedência.

Proposta:

```ts
DOPPLER_OBSTETRICO: {
  variant: "padrao",
  positive: /\b(doppler|dopplervelocimetria|art[eé]ria\s+umbilical|art[eé]ria\s+cerebral\s+m[eé]dia|acm|uterina\s+direita|uterina\s+esquerda|ducto\s+venoso|ip\s+m[eé]dio|rcp|perfil\s+hemodin[aâ]mico)\b/i,
  negation: /\b(sem|n[aã]o)\s+(?:fazer|realizar|incluir|avaliar|solicitar|usar|colocar)?\s*(?:o\s+)?doppler\b|\bdoppler\s+n[aã]o\s+(?:realizado|feito|inclu[ií]do|solicitado)\b/i,
  routeIfNegated: "OBSTETRICA"
}
```

Para "morfológico com Doppler", o seletor de categoria já deve continuar mandando para `MORFOLOGICO` (`morfologicoRouteSelection.ts`) e o Doppler entra como overlay/acessório. Não deixar DOPPLER_OBSTETRICO sequestrar morfológico.

## Proposta final manter/arquivar

| Título | Ação | Motivo |
|---|---|---|
| doppler-obstetrico-modelo-template-padrao | MANTER + revisar verbatim | único template |
| doppler-obstetrico-regra-funcao-e-extracao | MANTER por enquanto | contrato não entra nos estilos clássicos; depois arquivar |
| doppler-obstetrico-regra-ordem-secoes | MANTER | seção Doppler é sensível à ordem |
| doppler-obstetrico-regra-dias-da-ig-omitir-quando-zero | MANTER | canonical para IG |
| doppler-obstetrico-regra-liquido-amniotico-marcadores | MANTER | protocolo seguro |
| doppler-obstetrico-regra-correcoes-transcricao | MANTER | siglas/ditado |
| doppler-obstetrico-regra-dum-primeiraUSG-opcional | MANTER | DUM/primeira USG |
| doppler-obstetrico-regra-ip-medio-uterinas-auto-calculo | MANTER | cálculo operacional |
| doppler-obstetrico-regra-percentis-opcionais | MANTER | opt-in de percentis |
| doppler-obstetrico-regra-preservar-terminologia-do-medico | MANTER | fidelidade |
| doppler-obstetrico-regra-frases-normais-quando-omitido | MANTER | defaults |
| doppler-obstetrico-regra-unidades-biometria-fetal | MANTER | unidades |
| doppler-obstetrico-regra-dados-incompletos | MANTER | pergunta objetiva |
| doppler-obstetrico-regra-peso-fetal-percentil | MANTER | percentil/peso |
| doppler-obstetrico-regra-placenta-por-idade-gestacional | MANTER | placenta por IG |
| doppler-obstetrico-regra-gestacao-gemelar | MANTER | gemelar |
| doppler-obstetrico-regra-ip-medio-uterinas-percentil | MANTER | conclusão uterinas |
| doppler-obstetrico-regra-conclusao-ig-sem-zero-dias | ARQUIVAR | duplicata |
| doppler-obstetrico-regra-ossos-longos-morfologico | ARQUIVAR após roteamento morfo+Doppler | vazamento cross-category |
| doppler-obstetrico-frase-* | ARQUIVAR | fragmentos do modelo |
| doppler-obstetrico-conclusao-* | ARQUIVAR | duplicatas |
| doppler-obstetrico-excecao-* | ARQUIVAR | duplicatas |

Bundle resultante proposto: 1 modelo + 16 regras se o contrato ainda não for injetado nos estilos clássicos. Se `DOPPLER_OBSTETRICO_CONTRACT` passar a entrar para todos os estilos, arquivar também `regra-funcao-e-extracao` e revisar `dados-incompletos` para evitar repetição.

## Riscos específicos

O risco central é rota errada: "sem Doppler" não pode selecionar esta categoria. A negação precisa estar antes do gatilho positivo.

Outro risco é duplicidade de regra de IG: hoje existem duas regras de "sem zero dias". Em bundle completo, as duas brigam por atenção e aumentam prompt sem valor.

Também há risco de morfológico+Doppler cair aqui e perder anatomia fetal detalhada. O saneamento deve arquivar `ossos-longos-morfologico` só junto com garantia de roteamento para `MORFOLOGICO`.

## Artefatos executáveis para revisão

SQL proposto: `docs/det-2-sql-doppler_obstetrico.sql`.

Allowlist proposta: `docs/det-2-allowlist-doppler_obstetrico.json`.

DOPPLER_OBSTETRICO não precisa de entrada em `MODELO_VARIANT_SELECTORS` para modelo interno, porque tem um único `kind=modelo` real. A proposta executável é reusar a resolução de categoria já existente e endurecer o gate de categoria com negação antes de chegar no bundle:

```ts
// Categoria DOPPLER_OBSTETRICO: gate antes do bundle, nao seletor de modelo.
{
  categoryCode: "DOPPLER_OBSTETRICO",
  positive:
    /\b(doppler|dopplervelocimetria|art[eé]ria\s+umbilical|art[eé]ria\s+cerebral\s+m[eé]dia|acm|uterina\s+direita|uterina\s+esquerda|ducto\s+venoso|ip\s+m[eé]dio|rcp|perfil\s+hemodin[aâ]mico)\b/i,
  negation:
    /\b(?:sem|n[aã]o)\s+(?:(?:fazer|realizar|incluir|avaliar|solicitar|usar|colocar)\s+)?(?:o\s+)?doppler\b|\bdoppler\s+n[aã]o\s+(?:realizado|feito|inclu[ií]do|solicitado|avaliado)\b/i,
  ifNegatedRouteTo: "OBSTETRICA",
  ifMorphologicExam: "reuse resolveMorfologicoCategory(...) and route to MORFOLOGICO",
}
```
