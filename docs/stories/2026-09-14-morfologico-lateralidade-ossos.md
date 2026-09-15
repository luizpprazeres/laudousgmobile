# MORFOLOGICO: lateralidade dos seis ossos longos

Status: Implementacao local concluida; gates focados aprovados. Gates gerais
com bloqueios fora do escopo. Sem validacao de extracao LLM ao vivo ou deploy.

## Pedido e ownership

Pedido direto de Luiz: preservar comprimentos direitos e esquerdos distintos de
femur, tibia, fibula, umero, radio e ulna, sem inventar o contralateral.
Ownership restrito ao renderer categories/MORFOLOGICO.ts, testes novos de
lateralidade e esta story. Nao editar prompts/contracts/MORFOLOGICO.ts (coordenador),
pipeline, matematica, banco ou arquivos de outros agentes. Sem deploy, UI FMF,
rede de extracao ou dados reais. Preservar todas as alteracoes dirty existentes.

## Criterios de aceite

- [x] Ler testes padroes e diff preexistente antes de editar.
- [x] Reproduzir perda de medidas laterais no schema/renderer atual.
- [x] Adicionar 12 campos opcionais/nullable no Zod, com sufixos _dir_mm/_esq_mm.
- [x] Incluir os 12 campos nullable em properties e required do JSON strict.
- [x] Prompt local prioriza medidas especificas, sem duplicar unilateral no generico.
- [x] Classico e Objetivo 2T/3T preservam valores assimetricos dos seis ossos.
- [x] Unilateral nao preenche contralateral, mesmo com generico coexistente.
- [x] Generico so preenche ambos os lados quando nenhum lado foi informado para o osso.
- [x] Regressoes 1T/2T/3T, seis genericos, campos omitidos/null, schema e imutabilidade.
- [x] Rodar gates focados e gerais; registrar resultados e limitacoes.

## Decisao de compatibilidade

Campos antigos permanecem validos. Ausencia/null de ambos os campos laterais
mantem a saida generica anterior. Havendo qualquer lado numerico, o generico
nao completa o outro lado: fica o placeholder existente. A decisao e por osso,
nao pelo exame inteiro. Nenhum calculo ou arredondamento sera modificado.

## Dirty preservado

Antes desta tarefa o renderer ja incluia itens_conclusao_livres em required e
guards de sistemasAlterados no 1T classico/objetivo. Essas mudancas nao pertencem
a esta tarefa e serao mantidas. Testes e contrato do coordenador ja estao dirty.

## File List

- apps/api/src/server/renderer/categories/MORFOLOGICO.ts
- apps/api/src/server/renderer/__tests__/morfologico-lateralidade-fixtures.ts
- apps/api/src/server/renderer/__tests__/morfologico-lateralidade.manual.ts
- docs/stories/2026-09-14-morfologico-lateralidade-ossos.md

## Verificacao

Antes da correcao: 75 testes passaram, 184 falharam por perda dos campos laterais
no parse, ausencia no JSON schema/prompt e medidas laterais ignoradas no render.
Capturados hashes SHA-256 da saida legada dos tres trimestres nos dois estilos.

Pos-correcao:

- Lateralidade: 265/265 testes; seis hashes legados identicos (1T/2T/3T, ambos
  os estilos), 12 campos preservados pelo parse, tipos invalidos recusados,
  todos os ossos isolados e juntos, unilateral com/sem generico, isolamento
  entre ossos e secoes, imutabilidade e JSON strict recursivo.
- contrato-extracao-morfologico.manual.ts: aprovado, incluindo modulos aninhados.
- morfologico-objetivo-golden.manual.ts: 41/41.
- morfologico-23b4-ios-clinical-matrix.manual.ts: 89/89.
- morfologico-conclusao-sistemas.manual.ts: 18/18, preservando os guards dirty.
- catalog/__tests__/morfologico-ponta-a-ponta.manual.ts: exit 0 com flags
  IG_REFERENCE_CORRECTION, GRANNUM_PLACENTA e FLEXIBLE_CONCLUSION=true; conserva
  um bloqueio esperado do harness (face marcada alterada sem texto), nao uma
  comprovacao irrestrita de todos os fluxos.
- Typecheck focado: TypeScript createProgram com as opcoes do tsconfig da API,
  roots renderer + dois testes novos, dependencias transitivas incluidas,
  incremental=false/noEmit=true: zero diagnosticos.
- npm run typecheck: exit 2; erros em testes de pipeline fora do ownership:
  morfologico-fidelity-live.manual.ts:39 (string | undefined) e
  obstetricDopplerFlow.manual.ts:65 ("normal" nao pertence a GenerationMode).
  Esses arquivos surgiram no worktree durante o trabalho; nao foram editados.
- npm run lint: exit 1; Next solicita configurar ESLint interativamente.
  Nenhuma configuracao foi criada.
- npm test: exit 0, mas Turbo executa ZERO tarefas; nao conta como gate de testes.
- git diff --check: aprovado.

Comando da suite nova (raiz do monorepo):

```sh
pnpm exec tsx --tsconfig apps/api/tsconfig.json apps/api/src/server/renderer/__tests__/morfologico-lateralidade.manual.ts
```

Fixtures exclusivamente sinteticas. Teste de prompt e estrutural/estatico,
nao evidencia acuracia de extracao por LLM em runtime. Nao foi executado build
de producao, chamada remota, migracao, deploy ou UI FMF. Alteracoes de outros
agentes, inclusive contrato/pipeline e os tres hunks dirty iniciais do renderer,
foram preservadas.
