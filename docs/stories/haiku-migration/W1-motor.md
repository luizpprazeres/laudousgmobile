# W1 — Motor Haiku 5.5 (API) + roteamento + remover gpt-4.1-mini

Terminal: Claude Code Opus 5.5 · Worktree `~/laudousg-wt/motor` · Branch `feat/haiku-motor`
Leia antes: `_comum.md` e a story. **Carregue a skill `claude-api`** antes de escrever qualquer chamada Anthropic
e leia `typescript/claude-api/README.md` + a seção de structured outputs de `typescript/claude-api/tool-use.md`.

## Objetivo

Produção passa a usar **Claude Haiku 5.5 (`claude-haiku-5-5`) pela API Anthropic** (o `ANTHROPIC_API_KEY` já existe
em produção e é usado pelo Laudo Livre em `server/ai/livreProvider.ts`) em:

1. **Toda extração estruturada**: `renderer/extraction.ts` (`runRendererExtraction`, inclusive o modo stream que
   emite os eventos de progresso `achado`), free-slots em `pipeline/renderer.ts` (`renderFreeSlots`),
   `ai/openai.ts` (`structuredCompletion`) / `pipeline/structurer.ts`, e a sanity com IA (`OPENAI_MODEL_SANITY`,
   hoje `gpt-4.1-mini` em produção).
2. **Escritor**: `pipeline/writer.ts` (`runWriterStream`) e os writers dedicados que usam OpenAI
   (MSK, PELVE, PARTES_MOLES, Doppler renal/hepático/venoso — confira cada `*Writer.ts` e o modelo que usam, ex.
   `MSK_WRITER_MODEL`). O Livre já usa Haiku (`streamAnthropicLivreWriter`): reaproveite/generalize, não duplique.
3. **Remover o `gpt-4.1-mini`**: nenhum default, fallback ou caminho pode cair nele (`env.ts`:
   `OPENAI_MODEL_STRUCTURER`, `OPENAI_MODEL_WRITER`, `OPENAI_MODEL_SANITY`, Groq/fallbacks etc.). Faça um inventário
   com `grep -rn "gpt-4.1" apps packages` e trate cada ocorrência (testes/fixtures que só registram histórico podem ficar).

Mantenha um caminho de **rollback por env** (ex.: provider OpenAI com modelo explícito), mas o default em código é Haiku.
Modo "laudo difícil" (`HARD_MODE_MODEL`) e a categoria `TESTE`: não mexer — registre no relatório.

## Roteamento por categoria

Implemente a tabela da story **por configuração** (env com default no código), de modo que cada categoria possa ser
movida entre renderer+Haiku-extrator e writer-Haiku sem deploy de código:

- Família obstétrica e os 5 renderers clínicos fail-closed (`APPROVED_CLINICAL_RENDERERS` em
  `pipeline/generationPathResolver.ts`): renderer + Haiku extrator.
- Writers dedicados: continuam dedicados, modelo Haiku.
- `PELVE_FEMININA`: mantém o caminho atual por default, alternável por env para writer completo (o Luiz vai testar).
- Demais: writer completo (bundle com few-shots + guards `full`), modelo Haiku.

**Antes de tirar qualquer categoria do renderer**, faça o inventário de quem consome os achados estruturados do
renderer (`onFindings` / `auditState.structuredOutput`, esquemas visuais — tireoide, mama, mapa venoso —, Sala,
Companion, `/api/catalog`, web, sanity determinística). Categoria com consumidor que quebraria **fica no renderer +
Haiku extrator** e entra no relatório como decisão pendente do Luiz.

## Notas técnicas (Haiku 5.5 — confirme na skill)

- Saída estruturada: `output_config: { format: … }` (o `output_format` antigo está depreciado). Os JSON Schemas
  "strict" da OpenAI (ex. `ABDOMEN_TOTAL_FINDINGS_JSON_SCHEMA`, uniões `["number","null"]`) precisam ser aceitos —
  verifique cada schema de `EXTRACTORS`; se algum recurso não for suportado, adapte no ponto de chamada (não mude
  o contrato de extração).
- `temperature` diferente do default → **400** no Haiku 5.5: não enviar. Thinking é adaptativo por padrão; use
  `output_config.effort: "medium"` (é o que a bancada validou) — deixe configurável por env.
- Trate `stop_reason` `refusal` e `max_tokens` como erro explícito (a rota já tem fallback/fail-closed por categoria).
  `max_tokens` com folga para o thinking (extração ≥ 16000; writer em streaming).
- Prompt caching no system (os prompts de writer têm ~37 mil caracteres) — opcional, se simples.
- Auditoria/custo: `generation_audit.model_structurer/model_writer` devem registrar `claude-haiku-5-5`; atualize o
  cálculo de custo (preços na skill).

## Testes

- `pnpm -F api typecheck`; atualizar e rodar os `.manual.ts` afetados (ex. `pipeline/__tests__/modelResolver.manual.ts`,
  `clinicalReports/__tests__/generate-fail-closed.manual.ts`, `catalog-api/*`, testes do Livre).
- Testes unitários com cliente Anthropic **mockado** (o `streamAnthropicLivreWriter` já aceita `client`).
- Bancada: rode `--scenarios R` (replay) em ABDOMEN_TOTAL e OBSTETRICA para provar que o caminho do renderer
  não mudou com a troca de cliente. A bancada intercepta só `api.openai.com`: se a extração passar a usar o SDK
  Anthropic, **adapte a bancada** para interceptar o cliente Anthropic também (ex.: injetar um cliente fake que chama
  `callClaude`), mantendo o uso pela assinatura.
- Smoke real na API: opcional, no máximo 10 chamadas Haiku, só se houver `ANTHROPIC_API_KEY` no `.env`.

## Fora do escopo (outras frentes mexem)

`prompts/global.ts`, `prompts/contracts/*` e `renderer/phrases/*` (W3); prompts de extração obstétrica em
`renderer/categories/OBSTETRICA.ts` / `MORFOLOGICO.ts` (W2). Se precisar tocar nesses arquivos, pare e registre no status.

## Entregável

Commits em `feat/haiku-motor` + `docs/stories/haiku-migration/W1-relatorio.md` com: o que mudou, **lista de envs para a
Vercel** (criar / remover / valores), plano de rollback, inventário de consumidores dos achados por categoria,
tabela final de roteamento aplicada no default do código, riscos abertos.
