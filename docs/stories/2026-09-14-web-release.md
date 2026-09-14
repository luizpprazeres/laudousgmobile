# Publicacao isolada da web

Status: em verificacao. Autorizacao explicita de Luiz para commit, push e
publicacao web; Apple permanece em revisao sem nova compilacao nesta etapa.

## Escopo

Snapshot web das melhorias de categorias, tipografia, rins, obstetrica/Doppler,
biometria, protecoes de percentil, previa INTERGROWTH e formulario/folha PE.
Excluir alteracoes IAP, planos, DB, API, shared e Android ainda misturadas no
checkout original. Publicar somente projeto web apos conferir dependencias.

## Aceite

- [x] Snapshot isolado compila com dependencias do Git.
- [x] Lint web configurado e testes web executaveis pelo script test.
- [x] Testes explicitos e navegador com renderer HEAD passam.
- [ ] Commit/push do conjunto delimitado.
- [ ] Deploy web e verificacao publica, sem deploy API/Apple.

## Arquivos

apps/web: fontes e assets do snapshot, scripts de teste e configuracao ESLint.
pnpm-lock.yaml: dependencias de desenvolvimento dos gates web.
Esta story registra release; detalhes funcionais nas stories de 14/09.

Folha INTERGROWTH adicionada e verificada como1pagina A4, sem sobrescrever
campos. Teste de foco/portal e preview passou.11suites web passaram; lint
sem erros (avisos registrados), typecheck e build passaram. Instalacao
frozen-lockfile conferida. Sem alteracoes em API/shared/db/planos.

Reconferencia DevOps antes do commit (base dff9060): lint web rc=0 (0 erros,
avisos react-hooks/a11y), test rc=0 (11 suites), typecheck rc=0, git diff
--check limpo nos rastreados (avisos so em OFL e fonte INTERGROWTH, textos
externos mantidos literais), escopo restrito a apps/web, pnpm-lock, stories
web/intergrowth 14/09, 2 fontes INTERGROWTH e preflight.

Deploy exige branch separado: main redeployaria API mais antiga que a producao
IAP. Publicacao direta somente laudousg-web, dominio www.laudousg.com.br.

## Limites

Novos riscos de trissomias/prematuridade nao liberados. INTERGROWTH e previa
somente leitura; nao diagnostica nem sobrescreve peso/percentil manual.
