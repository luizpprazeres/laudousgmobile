# Fonte do percentil sem atribuicao automatica

Status: pronta para revisao local. Escopo pontual autorizado por Luiz.

## Contrato e limites

FetalGrowthModuleSchema aceita string; shared exige apenas texto nao vazio.
Renderer e formatter shared prefixam "pela curva". Payload ausente usara
"não informada", produzindo "pela curva não informada", sem nome inventado.
Isso reduz atribuicao falsa, nao valida clinicamente percentil/classificacao.
Sem alterar formulas, limiares, parser, validacao de percentil, API/shared,
Experience, banco, deploy ou commit. Dirty de outras frentes preservado.

## Aceite

- [x] UI inicia em Nao informada, sem Intergrowth implicito.
- [x] Fonte ausente/vazia e Outra sem nome usam nao informada.
- [x] Fontes explicitas e chaves de rascunhos antigos preservadas.
- [x] Teste dirigido incluindo contrato/renderer real somente leitura.
- [x] Typecheck e diff check.

## Arquivos

- apps/web/src/lib/deterministic/organs/fetalGrowth.ts
- apps/web/src/lib/catalog/fetalGrowthParaCatalogo.ts
- apps/web/tests/fetalGrowthSource.manual.ts
- docs/stories/2026-09-14-web-percentil-fonte.md

## Evidencias

`pnpm exec tsx --tsconfig apps/api/tsconfig.json apps/web/tests/fetalGrowthSource.manual.ts`:
13 casos passaram. Defaults OBST/MORFO; fontes ausentes, vazias e explicitas;
Outra com/sem nome; fonte legada; campos residuais ignorados e estado sem mutacao.
Schema API, renderer real e formatter shared aceitam a representacao e produzem
"Peso fetal estimado no percentil 8 pela curva não informada."
Classificacao existente mantida, sem afirmar validacao clinica por esses testes.

`pnpm --filter @laudousg/web typecheck`: passou, sessao88969 exit0.
`git diff --check`: passou. Nenhum teste pendente. Sem build/deploy/DB/commit.
