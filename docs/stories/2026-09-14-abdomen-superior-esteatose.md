# ABDOMEN_SUPERIOR: preservar esteatose ja extraida

Status: Ready for Review (local; gates gerais incompletos, sem autorizacao de publicacao). Story especifica criada por SM (River), a pedido de Luiz, antes de editar codigo; handoff para implementacao dev.

## Pedido e escopo

Como medico, quero que a esteatose leve presente nos achados estruturados seja aplicada ao laudo de abdome superior, sem alteracoes nos modulos compartilhados.

Autorizacao: auditoria e correcao local pontual; preservar dirty; somente modulo exclusivo ABDOMEN_SUPERIOR, testes novos e esta story. Sem deploy, banco, dados de pacientes ou alteracoes em /Users/luizprazeres/laudousg. Nao integra outras stories pendentes.

## Criterios de aceite

- [x] Reproduzir perda de esteatose leve com figado.status normal e achados presentes, comparando com ABDOMEN_TOTAL.
- [x] Parser publico de ABDOMEN_SUPERIOR normaliza achados usando a funcao existente da propria categoria.
- [x] Corpo e conclusao preservam esteatose nos estilos classico e objetivo.
- [x] Normalidade sem achados e casos coerentes permanecem identicos; preservar colecistectomia, gases sem achados, validacao e entrada original.
- [x] Verificar a origem no codigo de laudousg, distinguindo causa local de incidente real nao verificado.
- [x] Rodar regressao dedicada, goldens existentes e gates gerais; registrar limitacoes e file list.

## Dev Notes

Arquitetura: ditado -> extracao tipada -> renderer deterministico; JSON strict garante forma, nao coerencia entre status e achados. Fonte: docs/det-5-design.md, secoes Arquitetura e Schema de achados. Backends independentes: README.md, Relacao com outros repos; origem consultada em /Users/luizprazeres/laudousg/docs/architecture.md e docs/current-architecture-summary.md.

Evidencia inicial: extraction.ts chama normalizeFindings para ABDOMEN_TOTAL, mas apenas AbdomenSuperiorFindingsSchema.parse para ABDOMEN_SUPERIOR. normalizeAbdomenSuperior existe na categoria sem consumidores. renderFigado compartilhado ignora status diferente de alterado. Nao editar esses consumidores compartilhados.

## Tarefas

- [x] Ler instrucoes, arquitetura, dirty e comparar caminhos.
- [x] Criar teste sintetico e executar antes da correcao: 6 passam, 7 falham.
- [x] Implementar transformacao no schema exclusivo e repetir teste: 13 passam, zero falhas.
- [x] Verificar regressoes, origem e registrar resultado.

## CodeRabbit Integration

Tipo: bug de contrato de dados da API; escopo pequeno, risco clinico de omissao. Implementacao: dev; revisao: QA. Foco: normalizacao realmente chamada, ausencia de mutacao e de mudancas compartilhadas. CodeRabbit/PR/deploy nao executados nesta auditoria local.

## File List

Alterado: apps/api/src/server/renderer/categories/ABDOMEN_SUPERIOR.ts.

Criados: apps/api/src/server/renderer/__tests__/abdomen-superior-extraction-normalization.manual.ts; docs/stories/2026-09-14-abdomen-superior-esteatose.md.

## Verificacao

Reproducao offline pelo EXTRACTORS real (sem mocks de parser): figado.status normal com tipo esteatose/grau leve passa na validacao anterior, mas renderFigado retorna sem corpo/conclusao porque exige alterado. ABDOMEN_TOTAL normaliza esse mesmo estado e preserva o achado. O teste novo falhava em 7 de 13 cenarios antes; depois passa 13/13, incluindo ambos os estilos, tres graus, idempotencia e ausencia de mutacao.

Correcao: schema base privado + transform(normalizeAbdomenSuperior) no schema publico. Nao altera JSON Schema enviado ao LLM, prompt, frases ou pipelines compartilhados. Tambem conecta o fallback de achados livres ja existente na normalizacao, coberto pelo teste.

Origem: git blame de extraction.ts:289-294 atribui o registro sem normalizacao a c016bdb (2026-06-15, migracao de cinco categorias de writer para renderer); o modulo de ABDOMEN_SUPERIOR foi criado no mesmo commit. Em /Users/luizprazeres/laudousg, app/api/generate/route.ts:175-219 usa promptBuilder/generateTextStream e lib/categoryDefaults.ts:4337-4339 ja contem instrucao para esteatose. Este defeito de integracao do parser e local ao mobile, nao herdado desse caminho antigo. Nao se afirma ausencia de outros defeitos no projeto antigo.

Gates: teste novo 13/13; abdomen-superior-golden.manual.ts 40/40; abdomen-superior-objetivo-golden.manual.ts 40/40; abdomen-hepatopatia-cronica.manual.ts OK. npm run typecheck: API passou, monorepo falhou em apps/mobile/src/features/imaging/imageAnalysis.ts:133 (TS1323, import dinamico), arquivo de trabalho concorrente fora do ownership. npm run lint: saiu 1 solicitando configuracao de ESLint em API/lab. npm test: saiu 0, mas executou ZERO tarefas, portanto nao e gate verde. git diff --check passou. Build, CodeRabbit, smoke com LLM e producao nao executados.

Limites: reproduzido o mecanismo com achados sinteticos ja extraidos, nao o incidente especifico em producao. Se o LLM omitir completamente o achado (array vazio), esta correcao nao o recupera. Flag de renderer e personalizacao em producao nao verificadas. Nenhum caso de paciente, segredo ou servico remoto consultado; sem deploy/banco. Dirty preexistente e mudancas concorrentes preservados. Cache project-status.yaml criado pelo greeting do SM foi removido, sem mudanca final no projeto antigo.
