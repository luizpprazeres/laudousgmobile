# Web: Doppler obstetrico combinado por padrao

## Status

Implementado e verificado localmente; pronto para revisao. Escopo autorizado
por Luiz em 14/09/2026. Sem deploy.

## Escopo e ownership

Responsavel unico desta etapa: Codex, em apps/web, incluindo LaudarWebExperience.
Preservar o dirty preexistente. Nao alterar planos.ts, PE, rins, curvas,
apps/api ou packages/shared. Colmeia e novos calculos ficam adiados.

## Contrato

DOPPLER_OBSTETRICO abre combinado com a avaliacao obstetrica; o toggle
"Somente Doppler" restringe formulario, payload e documento ao exame isolado.
OBSTETRICA nao oferece nem envia complemento Doppler. MORFOLOGICO permanece
com seu complemento opcional atual. Nao reinterpretar laudos historicos.

O catalogo existente representa o combinado por OBSTETRICA + dados.doppler;
o endpoint DOPPLER_OBSTETRICO representa somente o isolado. Reutilizar ambos,
sem concatenar laudos na web. Categoria salva continua DOPPLER_OBSTETRICO,
com modo explicito no estado. Nao ha mudanca nos clientes nativos nesta etapa.

## Aceite

- [x] Combinado por padrao e toggle somente Doppler.
- [x] Obstetrica sem complemento; Morfologico opcional preservado.
- [x] Campos ocultos do modo nao atravessam render nem persistencia.
- [x] Rascunhos manuais separados por modo, sem perda ao alternar.
- [x] Entrada estruturada do celular compativel com os dois modos.
- [x] Testes de combinado/isolado e renderer nos dois estilos.
- [x] Typecheck web.
- [x] Build web.

## Verificacao

Executado em 14/09/2026:

- `pnpm exec tsx --tsconfig apps/api/tsconfig.json apps/web/tests/dopplerWebMode.manual.ts`: 9 casos, incluindo renderer real nos dois estilos, sem rede/banco.
- `pnpm exec tsx --tsconfig apps/web/tsconfig.json apps/web/src/lib/companionStructured.test.ts`: passou, com novo contrato de indices/IG/biometria.
- `pnpm exec tsx --tsconfig apps/web/tsconfig.json apps/web/src/lib/catalog/morfologicoPrimeiroTrimestre.test.mts`: passou.
- `pnpm exec tsx apps/web/src/components/laudar/__tests__/report-rich-text.manual.ts`: passou.
- `pnpm exec tsx --tsconfig apps/api/tsconfig.json apps/api/src/server/renderer/__tests__/doppler-obstetrico-golden.manual.ts`: 26 passaram, zero falhas; API somente lida.
- `pnpm --filter @laudousg/web typecheck`: passou separadamente do build.
- `pnpm --filter @laudousg/web build`: compilou e gerou 17/17 paginas. A configuracao existente pula TypeScript no build; nao foi usada como substituto do typecheck.
- `pnpm --filter @laudousg/web lint`: bloqueado pelo assistente de configuracao preexistente do ESLint, exit 1. Nao foi alterada configuracao nesta etapa.
- `git diff --check`: passou.
- Browser: `PLAYWRIGHT_MODULE=/caminho/para/playwright pnpm exec tsx --tsconfig apps/api/tsconfig.json apps/web/tests/dopplerWeb.browser.manual.ts`. Passou troca de modos, preservacao de rascunhos, payload salvo sem campos ocultos, resposta atrasada e recusa de salvar apos falha. Playwright reutilizado da instalacao existente em `laudousg/node_modules/playwright`, sem instalar dependencias.
- Capturas desktop 1440x900 revisadas: `/var/folders/c2/2y81mr3n5392dr5g0fsgfvq00000gn/T/doppler-web-ewObLx/combined.png` e `isolated.png`.

Fechamento visual adicional: IAB confirmou combinado e toggle isolado; viewport
desktop 1440x900 e mobile 390x844. Playwright repetiu a captura real de ambos os
modos em ambos os tamanhos, em
`/var/folders/c2/2y81mr3n5392dr5g0fsgfvq00000gn/T/doppler-web-9sWrT0/`:
`combined.png`, `isolated.png`, `mobile-combined.png`, `mobile-isolated.png`.

**Registro inicial: desktop aprovado; mobile tinha NO-GO visual preexistente.** O toggle
funciona, mas o editor comeca em x=713 numa viewport de 390px. A grade fixa
196px + minmax(380px, ...) + minmax(500px, ...) ja consta no HEAD anterior,
LaudarWebExperience.tsx:731. Nao foi ampliado o escopo para reformular o shell.
Esse bloqueio foi corrigido posteriormente, com autorizacao explicita abaixo.

### Fechamento responsivo e label visual

- [x] Correcao minima em LaudarWebExperience: uma coluna abaixo de 1280px,
  altura natural, texto e controles com quebra; colunas desktop preservadas.
- [x] Override visual por chave DOPPLER_OBSTETRICO: "Obstétrica com Doppler"
  no seletor e suas opcoes. Sem reclassificacao nem alteracao do label no banco.
- [x] Browser repetido: combinado/isolado, drafts, save, falha e resposta atrasada.
  Sem overflow horizontal em 320/390/768/1280px; editor mobile dentro da tela.
- [x] Valores efetivamente digitados em desktop e mobile: DBP 82, CC 295,
  CA 285, CF 62 e peso 1900. Todos chegam ao renderer/laudo; nao sao placeholders.
  Lacunas restantes pertencem a campos nao preenchidos, como BCF e IG.
- [x] Typecheck repetido apos o override visual: exit 0.
- [x] Build repetido apos responsividade/label: 17/17 paginas, sessao 51864,
  exit 0. Diff check passou; nenhuma sessao de teste/build pendente.

Capturas novas revisadas (desktop 1440x900, mobile 390x844, pagina completa):
`tmp-review/web-doppler-responsive/combined.png`, `isolated.png`,
`mobile-combined.png`, `mobile-isolated.png`.
Teste browser final: sessao 39265, exit 0. Previa atualizada com rebuild do
bundle por refresh: `http://127.0.0.1:3108`, sessao 28134.
A sessao 5760 abaixo foi preservada com o bundle anterior, conforme solicitado.
Nenhuma mudanca em API/shared/db ou deploy. Label do banco aguarda coordenacao.

Servidor de previa HTTP 200: `http://127.0.0.1:3107`, sessao `5760`, mantida
ativa a pedido. Nenhuma sessao de teste pendente no fechamento; ultimo teste
de navegador `37992` terminou com exit 0 (funcional), registrando o NO-GO visual.

O browser usa componentes reais e renderer real, mas autenticacao e gravacao
simuladas, sem contato com producao. Nao e smoke autenticado do deploy.
Nao foram modificados clientes nativos; a entrada estruturada do celular foi
testada por fixtures, nao por pareamento real. Esta etapa nao comprova paridade
de interface com iOS/Android. Fonte de texto continua sendo o renderer comum.

Dependencia explicita: se for exigido que o combinado seja renderizado pelo
endpoint `/api/catalog/DOPPLER_OBSTETRICO/render` em vez do contrato existente
OBSTETRICA + doppler, sera preciso trabalho separado de API. Hoje esse endpoint
e exclusivamente isolado. O modo escolhido fica em `exam_state.__opts` e o texto
persistido nao e reinterpretado. A Biblioteca nao foi reformulada nesta etapa.

Previa sintetica opcional: `DOPPLER_WEB_PREVIEW=1 PORT=3107 pnpm exec tsx --tsconfig apps/api/tsconfig.json apps/web/tests/dopplerWeb.browser.manual.ts`.
O salvamento dessa previa existe apenas em memoria e desaparece ao encerrar.

## File list

### Incremento: calculadoras no combinado

Pedido pontual posterior: herdar `obstetrica.calculators ?? []` somente no
combinado via resolveCalculators; isolado retorna []. Sem novas formulas,
sem alterar flags de liberacao ou LaudarWebExperience (ownership coordenador).
Imports conferidos: obstetrica nao importa dopplerObstetrico; heranca das
sections ja era existente, sem nova aresta de dependencia.

- [x] Resolver e teste combinado/isolado/retorno, preservando identidade das specs.
- [x] Typecheck e regressao Doppler: 10 casos passaram; typecheck sessao82343
  exit0. Sem novo build/deploy, formulas ou alteracao de flags.
- [x] Browser na previa integrada3110: OBST -> PE -> categorias -> mesma OBST
  preservou peso73, IP direito1,21/esquerdo1,24 e media1,225. Sessao17260 exit0,
  navegador encerrado. Teste sobre alteracao hidden do coordenador, sem editar
  Experience, picker ou dopplerWeb.browser.manual.ts. Sem teste pendente.

### Arquivos

- `apps/web/src/components/laudar/ExamSectionNav.tsx`
- `apps/web/src/components/laudar/LaudarWebExperience.tsx` (preservado diff anterior de categoryContentGroupLabel)
- `apps/web/src/lib/catalog/dopplerWebMode.ts`
- `apps/web/src/lib/catalog/obstetricaParaCatalogo.ts`
- `apps/web/src/lib/catalog/useLaudoCanonico.ts`
- `apps/web/src/lib/companionStructured.ts`
- `apps/web/src/lib/companionStructured.test.ts`
- `apps/web/src/lib/deterministic/organs/dopplerObstetrico.ts`
- `apps/web/src/lib/deterministic/organs/obstetrica.ts`
- `apps/web/tests/dopplerWebMode.manual.ts`
- `apps/web/tests/dopplerWeb.browser.tsx`
- `apps/web/tests/dopplerWeb.browser.manual.ts`
- `docs/stories/2026-09-14-web-doppler-combinado.md`

`categoryPresentation.ts` e `planos.ts` ja estavam dirty e nao foram editados
nesta etapa. API/shared/db e as frentes adiadas foram preservados.
