# Percentil invalido bloqueia montagem

Status: verificada localmente pelo coordenador, sem deploy. Escopo pontual autorizado por Luiz.

Contrato lido: adaptadores retornam Pendencia com onde/valor/motivo/bloqueia.
useLaudoCanonico filtra bloqueia, limpa texto e retorna antes do fetch.
Nao lancar exception para percentil invalido. Estado bruto deve permanecer.

## Aceite

- [x] Avaliar sim: vazio, lixo, negativo e maior que100 geram pendencia bloqueante.
- [x] Aceitar 0/100 e decimais com virgula/ponto, sem parseFloat parcial.
- [x] Avaliar nao: manter rascunho sem pendencia de crescimento.
- [x] OBST/MORFO e combinado herdam bloqueio; fontes corrigidas preservadas.
- [x] Teste dirigido, regressao fontes, typecheck e diff check.
- [x] Browser: aviso, bloqueio de salvamento/request e rascunho preservado.

## Ownership

- apps/web/src/lib/catalog/fetalGrowthParaCatalogo.ts
- apps/web/src/lib/catalog/obstetricaParaCatalogo.ts
- apps/web/src/lib/catalog/morfologicoParaCatalogo.ts
- apps/web/tests/fetalGrowthPercentile.manual.ts
- apps/web/tests/dopplerWeb.browser.manual.ts (coordenador)
- docs/stories/2026-09-14-web-percentil-pendencias.md

Sem alterar parser de outros campos, formulas, fontes, shared/API, Experience,
harness do coordenador, DB, deploy ou commit. Browser a cargo do coordenador.

## Evidencias

`pnpm exec tsx --tsconfig apps/api/tsconfig.json apps/web/tests/fetalGrowthPercentile.manual.ts`:
55 casos passaram (sessao43607 exit0), incluindo os tres adaptadores, valores
brutos preservados, desligar/religar e ausencia de bloqueio no Doppler isolado.
`pnpm exec tsx --tsconfig apps/api/tsconfig.json apps/web/tests/fetalGrowthSource.manual.ts`:
13 casos passaram; fontes e contrato renderer preservados.
`pnpm --filter @laudousg/web typecheck`: passou, sessao21593 exit0.
`git diff --check`: passou. Nenhum teste pendente desta tarefa.

Para o browser: label do input "Percentil do peso fetal"; pendencia:
onde="Percentil do peso fetal", motivo="Informe um número entre 0 e 100, sem %."
O hook exibe "Percentil do peso fetal: Informe um número entre 0 e 100, sem %."
no aviso existente de laudo nao montado. Sem alterar hook ou UI.

Coordenador repetiu55casos com sucesso. Harness de navegador passou:8abc
gera aviso, nao salva texto anterior, nao requisita renderer durante bloqueio,
e preserva input ao desligar/religar crescimento. Fluxos anteriores do harness
tambem passaram. Build web e typecheck8/8 passaram. Lint segue bloqueado pela
configuracao ESLint preexistente; npm test executa zero tarefas, nao e gate.
