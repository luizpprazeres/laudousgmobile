# Web: medidas renais dentro de Dimensoes

## Escopo e arquitetura (antes do codigo)

Derivada de 2026-09-14-modelos-e-calculadoras.md: rins compactos em ABDOMEN_TOTAL.
Schema rim.ts descreve ambos os rins, consumido por OrganFormPanel. O formulario
guarda OrganState (strings/arrays); adaptarAbdome le medidas/espessura e envia ao
renderer canonico. compose local do rim nao e o caminho do laudo desta categoria.

OrganFormPanel e compartilhado: usar condicao estrita category ABDOMEN_TOTAL e
id rim_direito/rim_esquerdo, sem alterar comportamento generico dos campos.
Componente renal dedicado dentro de Dimensoes; os dois inputs usam as mesmas
chaves, labels, unidades e placeholders do schema. Sem calculos novos.

Desmarcar guarda medidas/espessura em chaves de rascunho do proprio OrganState e
esvazia os campos ativos, sem mudar adaptador/renderer. Remarcar restaura os
valores. Estado legado com valores inicia marcado. Rascunho acompanha o ciclo
de vida do estado do exame, sem prometer persistencia apos fechar/recarregar.
Texto editado manualmente continua protegido pelo fluxo atual de LaudarWebExperience;
nao sobrescrever nem modificar essa politica nesta frente.

## Ownership

Somente componente renal, helper de estado renal, integracao condicionada em
OrganFormPanel, testes exclusivos e esta story. Nao editar Android, PE, picker,
LaudarWebExperience, API, shared, renderer/adaptadores ou producao. Sem deploy.

## Checklist

- [x] Ler story geral, arquitetura e caminho real formulario/adaptador/renderer.
- [x] Registrar story e escopo antes do codigo.
- [x] Checkbox Informar medidas dentro de Dimensoes nos dois rins.
- [x] Medidas/espessura em duas colunas responsivas, sem campos duplicados.
- [x] Desmarcar exclui campos ativos e preserva rascunho ao remarcar.
- [x] Sem alterar selecoes qualitativas, achados, unidades ou matematica.
- [x] Testes focused de estado, adaptador e renderer canonico.
- [x] Typecheck e verificacao de diff.
- [x] Testes de navegador e screenshots desktop/mobile revisados.

## Arquivos

- apps/web/src/components/laudar/OrganFormPanel.tsx
- apps/web/src/components/laudar/RenalMeasurementsFields.tsx
- apps/web/src/components/laudar/renalMeasurementsState.ts
- apps/web/tests/renalMeasurements.manual.ts
- apps/web/tests/renalMeasurements.fixture.ts
- apps/web/tests/renalMeasurements.browser.tsx
- apps/web/tests/renalMeasurements.browser.manual.ts
- docs/stories/2026-09-14-web-rins-dimensoes.md

## Evidencia

`pnpm exec tsx --tsconfig apps/api/tsconfig.json apps/web/tests/renalMeasurements.manual.ts`:
13/13 passaram. Cobre dois lados, normal/reduzido, estilos CLASSICO_COMPLETO e
OBJETIVO, legado preenchido, campos parciais, imutabilidade, ciclos do toggle,
independencia lateral, exclusao e restauracao no adaptador/renderer reais.

`npm run typecheck` em apps/web passou. Primeira rodada apontou TS7053 no helper;
corrigido com anotacao explicita OrganState e repetido com exit 0.
`git diff --check` passou. `CI=1 npm run lint` nao analisou codigo: Next solicitou
configuracao inicial do ESLint e terminou exit 1. Nao alterar configuracao global.
Build web nao repetido nesta frente; coordenador informou build aprovado em
paralelo. Nao atribuir esse resultado a uma execucao independente desta tarefa.

`PLAYWRIGHT_MODULE=<instalacao-local>/playwright pnpm exec tsx --tsconfig apps/api/tsconfig.json apps/web/tests/renalMeasurements.browser.manual.ts`:
passou, Chromium headless. Checkbox/inputs reais, preenchimento bilateral,
dimensoes reduzidas, exclusao do laudo, restauracao e ausencia de erro JS.
Bounds dos inputs verificam duas colunas alinhadas e sem overflow de pagina em
320, 390, 768 e 1440 px. Capturas em tmp-review/web-rins-dimensoes:
desktop.png, desktop-desmarcado.png, mobile.png, width-320.png, width-768.png,
width-1440.png. Desktop, mobile e 320 revisados visualmente.

Harness renal isolado usa OrganFormPanel, schema e adaptador reais, com renderer
local real e mascara sintetica. A primeira chamada sem mascara foi recusada;
corrigida a fixture, sem modificar API nem consultar banco. Nao usa o seletor
inicial/LaudarWebExperience nem altera os testes Doppler do coordenador.
Sem smoke autenticado, salvamento ou pareamento real. Rascunho digitado manualmente
no editor nao e sobrescrito: permanece a politica existente fora deste escopo.

## Autorizacao adicional: rotulos renais longos

Capturas iniciais 320/390 mostraram rotulo Angiomiolipoma invadindo o vizinho no checklist
compacto preexistente (OrganFormPanel, grid-cols-3 e span de opcao em renderField
checklist). Luiz ampliou explicitamente o escopo para corrigir este layout dentro
de OrganFormPanel, condicionado aos rins. Autorizacao registrada antes do codigo.
Usar duas colunas no checklist renal compacto, min-width e quebra de palavras
nos rotulos, preservando checkbox, campos de medidas e semantica das selecoes.
Nao alterar outros orgaos. Build do coordenador sessao92675 em andamento: nao
iniciar outro build. Repetir navegador/screenshots e encerrar preview proprio.

Concluido: checklist compacto renal agora usa duas colunas; item/rotulo com
min-w-0 e overflow-wrap:anywhere, checkbox sem encolhimento. Expansao usa
col-span-2 apenas renal; demais orgaos mantem suas classes anteriores.
Medidas, espessura e semantica dos achados preservadas.

Navegador repetido: passou em 320/390/768/1440, incluindo bounds do texto de
Angiomiolipoma/Cisto complexo dentro do botao e sem invadir checkbox, ambos os
rins. Expandir ambos os achados em 320 preservou medidas/espessura e manteve
os subcampos acessiveis. Capturas atualizadas; width-320.png e
mobile-achados-expandidos.png revisadas visualmente, sem sobreposicao.
Typecheck repetido: exit 0. Diff check: passou. Nenhum novo build executado;
coordenador informou sucesso do build92675 e preview integrado em 3110.
Preview de teste encerrado automaticamente no finally (sessao38475 concluida),
sem novo preview persistente. Preview antigo64968 ja estava encerrado.
