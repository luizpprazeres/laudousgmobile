# Web PE: historia condicional e fonte exclusiva do IP

Status: pronta para revisao local. Derivada da story modelos-e-calculadoras e pedido
explicito de 14/09/2026. Ownership desta etapa: campos/layout da calculadora PE.

## Aceite

- [x] Nulipara/multipara; PE previa somente para multipara. Preservar dados
  obstetricos ao alternar, excluindo campos inaplicaveis do calculo.
- [x] Paridade inicialmente vazia; multipara exige Sim/Nao explicito para PE
  previa antes de calcular, sem presumir resposta negativa.
- [x] Labels curtos HAS cronica / DM tipo 1 ou 2 / In vitro; significado no
  title e aria-description, incluindo pre-gestacional e exclusao de DMG.
- [x] IP direito/esquerdo/medio em tres colunas que cabem no painel mobile.
  Fonte bilateral ou manual exclusiva; troca limpa IP anterior; bilateral
  incompleto impede resultado; media vem dos dois lados, sem arredondar kernel.
- [x] Preservar 1 a 4 afericoes PA e kernel FMF compartilhado.
- [x] Testes comportamento, capturas desktop/mobile e typecheck.
- [x] Grupos de radio independentes com useId, testados com dois paineis.
- [ ] Build proprio final (tentativa interrompida por arquivos .next ausentes;
  coordenador reportou build verde, sem repetir concorrencia nesta etapa).

## Limites

Sem editar LaudarWebExperience, category picker, renal, API/shared, algoritmos
FMF, banco ou producao. Sem deploy. Preservar dirty e preview Doppler 3108.
Testes locais nao equivalem a validacao clinica externa do FMF.

## File list

- apps/web/src/components/laudar/PreEclampsiaFmfPanel.tsx
- apps/web/src/lib/calculators/preEclampsia.ts
- apps/web/src/lib/calculators/preEclampsia.test.mts
- apps/web/tests/peWeb.browser.tsx
- apps/web/tests/peWeb.browser.manual.ts
- docs/stories/2026-09-14-web-pe-campos.md

## Evidencias

`pnpm exec tsx apps/web/src/lib/calculators/preEclampsia.test.mts`: 31/31.
Inclui media bilateral equivalente a manual no kernel, entradas invalidas,
residuos ignorados da fonte inativa, troca limpando IPs, historia inaplicavel
excluida e 1/2/3/4 afericoes preservadas.

`PLAYWRIGHT_MODULE=/Users/luizprazeres/laudousg/node_modules/playwright pnpm exec tsx --tsconfig apps/api/tsconfig.json apps/web/tests/peWeb.browser.manual.ts`:
passou, sessao54479 exit0. Cliques reais no painel, kernel real, dados ficticios,
sem API/banco. Sem dependencia de seletor inicial ou harness Doppler (ownership
do coordenador). CSS compilado da configuracao web sem depender de .next.
Comprova controles, resposta PE obrigatoria, historia retida nas alternancias,
IP exclusivo, media na previa, aviso de bloco inserido antigo e dois paineis.
Layout sem overflow em 320/390/768; IPs alinhados na mesma linha e dentro da tela.

Capturas finais revisadas: `tmp-review/web-pe-campos/desktop-bilateral.png`
(1280px), `mobile-bilateral.png` e `mobile-manual-nulipara.png` (390px).
Previa dedicada3109, sessao21657, encerrada a pedido do coordenador;
integracao visual segue na previa3108. Badge Modelo FMF recebeu shrink-0 e
whitespace-nowrap para nao quebrar no mobile, sem mudar cards ou outros layouts.
Sessao12571 anterior encerrada para substituir bundle. Media exibida com Intl
pt-BR, maximo 3 casas; casos 1.1/1.3 -> 1,2 e 1.21/1.24 -> 1,225 testados no
browser. Adaptador confirma media integral sem arredondamento enviada ao kernel.
Preview Doppler3108 preservado, sem alterar seus arquivos nesta rodada.

`pnpm --filter @laudousg/web typecheck`: passou apos ajustes finais, sessao33992
exit0. Rodada intermediaria encontrou erros em renalMeasurementsState (ownership
externo); nenhum ajuste feito nesse arquivo. Repeticao global passou.
`git diff --check`: passou.
Lint: bloqueado por wizard ESLint preexistente, exit1, sem configurar lint.
`pnpm --filter @laudousg/web test` nao executa suite: pacote nao tem script test;
nao contado como gate. Gates executados sao os dois testes explicitos acima.
Build proprio compilou/gerou17 paginas, mas terminou exit1 por arquivo .next
ausente durante trabalho simultaneo. Coordenador reportou build bem-sucedido;
nao equivale a build proprio apos os ultimos ajustes de labels.
Nenhuma sessao de teste/build pendente; sem deploy ou validacao clinica externa.
