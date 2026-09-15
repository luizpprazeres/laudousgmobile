# Biometria integrada e folha imprimivel

Pedido de Luiz: continuar pendencias usando Opus em Claude Code, com agentes
em paralelo. Planejamento do coordenador, sem publicar nem alterar matematica.

## Aceite

- [x] Biometria e crescimento na mesma secao visual, mantendo chaves/dados.
- [x] Rascunhos, navegacao, reset e modo Doppler isolado preservados.
- [x] Folha de pre-eclampsia imprimivel com resultado atual e versao do motor.
- [x] Sem novos calculos, curvas ficticias, recomendacoes ou certificacao.
- [x] Testes de navegador, impressao, tipos e build pelo coordenador.

## Ownership

Opus Biometria: LaudarWebExperience.tsx, novo BiometryGrowthPanel.tsx e helper
opcional de agrupamento em apps/web/src/components/laudar/.
Opus Impressao: PreEclampsiaFmfPanel.tsx e novo PreEclampsiaPrintSheet.tsx.
Coordenador: esta story, briefs, testes de navegador e integracao final.
Nenhum agente altera arquivos do outro, shared, API, iOS, Android, banco,
prompts clinicos, App Store, signing ou configuracao. Nenhum commit/deploy.

## Estado

Claude Code local autenticado. Broker medmaestri indisponivel neste terminal;
usar duas sessoes CLI diretas com modelo opus, sem bypass de permissoes.
Implementacao existente possui dados manuais de peso/percentil. Agrupar UI nao
autoriza chamar esses dados de calculados. Comparacao externa FMF pendente.

## Entrega local e verificacao

Duas sessoes Claude Code concluiram sem erro, modelo efetivo claude-opus-5.
Coordenador corrigiu conflito entre Tab da folha e navegacao de orgaos,
adicionou ciclo de foco e ajustou toolbar para 320 px.

Typecheck: 8 pacotes passaram; build web passou. Teste de agrupamento:
6 categorias/modos, incluindo morfologico 1t sem agrupamento indevido.
Regressao de percentil: 55 casos passaram. Playwright passou com renderer
real e autenticacao/salvamento simulados: modos, rascunhos, respostas atrasadas,
falhas, percentil invalido, reset dos dois modulos, folha atual mesmo apos
insercao de resultado anterior, ausencia de impressao para dados invalidos,
Tab/Shift-Tab/Escape, restauracao de foco e limpeza de inert/portal.
Layouts verificados em desktop e 390/320 px; PDF sintetico inspecionado,
uma pagina A4, sem controles/interface. Evidencia final de navegador:
/var/folders/c2/2y81mr3n5392dr5g0fsgfvq00000gn/T/doppler-web-hYJPCp
PDF renderizado inspecionado (mesmo layout final):
/var/folders/c2/2y81mr3n5392dr5g0fsgfvq00000gn/T/doppler-web-Vd9EQh/pe-sheet.pdf

Lint continua bloqueado pela configuracao ESLint ausente, anterior a esta
entrega. npm test executa zero tarefas; nao tratado como evidencia positiva.
git diff --check passou. Sem commit, deploy, SQL ou alteracao da App Store.

## File list

- apps/web/src/components/laudar/LaudarWebExperience.tsx
- apps/web/src/components/laudar/BiometryGrowthPanel.tsx
- apps/web/src/components/laudar/biometryGrowthSections.ts
- apps/web/src/components/laudar/PreEclampsiaFmfPanel.tsx
- apps/web/src/components/laudar/PreEclampsiaPrintSheet.tsx
- apps/web/tests/biometryGrowthSections.manual.ts
- apps/web/tests/dopplerWeb.browser.manual.ts
- docs/opus-biometria-brief.md
- docs/opus-impressao-brief.md
- docs/stories/2026-09-14-web-biometria-impressao.md

## Pendencias fora desta entrega

Comparacao externa FMF nao concluida; folha nao significa validacao clinica.
Peso/percentis automaticos, invalidacao de percentil apos alterar peso/IG,
sexo no texto, outras calculadoras/curvas, identificacao e envio da folha
para sala auxiliar, smoke autenticado e publicacao permanecem separados.
