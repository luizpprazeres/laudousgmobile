# Correções da revisão adversarial — backend admin fase 2

Branch `feat/admin-dados`, base `b3772fd6`. Correções locais; nenhum deploy, push ou SQL remoto executado. A única consulta de produção desta rodada foi a listagem de nomes de variáveis Vercel solicitada em C1.

## Resultado por achado

| Achado | Correção e evidência |
| --- | --- |
| B1 | `apps/api/src/server/iap/notifications.ts:67` e `:90` isolam record/result com `bestEffortJournal`. `notificationJournal.ts:23` captura exceções e erros PostgREST com log de código fixo, sem payload/erro bruto. O adaptador usa timeout de 3s por operação. Falha de insert/result não impede `applyTransaction`, TEST ou ignored. Falha real no repositório de assinatura continua propagada para 503; assinatura inválida continua recusada. |
| B2 | `apps/api/src/app/api/generate/route.ts:1862` voltou a preencher `generation_audit.openai_cost_usd` com `estimateCost(input, output, modelWriter)`. O helper usa PRICE_SEED, retorna custo para modelo conhecido e nulo para desconhecido. Mantém a estimativa legada consumida por Lab/dissecador/admin; não é a contabilização detalhada por chamada. |
| C1 | `TRANSCRIBE_MODEL` **presente em Production** do projeto `laudousgmobile`, conferido por nome em `2026-10-22T01:28:01Z`. Comando: `vercel env ls production --no-color`, exit 0. A saída foi filtrada em memória para registrar somente presença do nome; nenhum valor foi buscado, exibido ou salvo. A presença não identifica qual modelo está configurado. |
| C2 | `pricing.ts:164` calcula entrada de áudio e texto separadamente; `/api/transcribe` lê `usage.input_token_details.audio_tokens/text_tokens` e os eventos preservam os contadores separados e o total. Soma divergente, divisão ausente, tarifa de áudio ausente ou cache não tarifável deixam custo nulo. A tarifa de áudio do Transcribe completo foi verificada no Cookbook oficial; a do Mini permanece pendente de fonte oficial verificável, conforme detalhe abaixo. |
| C3 | Duas linhas exatas do Luna no seed têm `cache_write_per_million=NULL`, mantendo input/cache/output já conferidos pelo orquestrador. Nova migração UPDATE limitada às duas versões existentes; arquivo apenas. |
| C5 | `livreRouter.ts:383` e no retorno usam optional chaining em `response.usage`. Resposta válida sem usage continua válida com contadores indefinidos; recusa sem usage mantém o código `LIVRE_ROUTER_REFUSED`. |

## B1: os testes agora exigem disponibilidade da assinatura

O gate `iap-journal.manual.ts` foi corrigido: a expectativa anterior de que falha no diário bloqueasse a assinatura foi removida. Cobre `record` e `result` rejeitando, erro retornado pelo PostgREST e insert lançando exceção no adaptador real. Em todos esses casos, uma transação válida é aplicada; TEST e ignored continuam retornando seus resultados normais, que o webhook converte em 200. Logs não contêm o texto privado da falha. Verificação de assinatura, deduplicação dos fatos, reentrega e falha real do repositório mantêm seus testes.

## C2: tarifa de áudio e limite da verificação oficial

O exemplo oficial da OpenAI separa, para `gpt-4o-transcribe`, US$ 6 por milhão de tokens de áudio de entrada, US$ 2,50 por milhão de tokens de texto de entrada e US$ 10 por milhão de tokens de texto de saída. [Cookbook oficial: cálculo por modalidade](https://developers.openai.com/cookbook/examples/realtime_out_of_band_transcription).

A página atual de preços mostra US$ 1,25/5 para entrada/saída do Mini e um custo **estimado** de US$ 0,003 por minuto. O conteúdo oficial recuperado nesta rodada não confirmou um preço por milhão de tokens de áudio do Mini. Não usei a estimativa por minuto para inventar essa conversão, nem uma cópia da documentação em site de terceiros como prova. Foi solicitada ao orquestrador a URL oficial da tarifa de áudio do Mini. [Página oficial de preços](https://developers.openai.com/api/docs/pricing).

Até essa confirmação, a entrada de áudio do Mini fica sem preço (`audio_input_per_million=NULL`), com custo desconhecido explícito; os tokens continuam registrados separados. A correção impede aplicar US$ 1,25 ao total misto de áudio/texto. Também evita tarifar pelo preço de texto uma resposta cujo provedor omita a divisão de modalidades. Whisper mantém cálculo por duração medida e o contrato público `{ transcript, language }` foi preservado.

## Migrações novas — somente arquivos

`20261022013042_admin_luna_cache_write_correction.sql` corrige apenas `cache_write_per_million` das duas linhas Luna. Não modifica preços de outros modelos nem recalcula eventos históricos.

```sql
-- [Story admin-fase2] C3: file only, pending review/application by the orchestrator.
-- Explicit correction requested by Luiz/orchestrator: OpenAI cache writes have no separate charge.
-- Keep the verified input/cached/output rates and the two existing price versions intact.
BEGIN;
UPDATE public.ai_model_prices
SET cache_write_per_million = NULL
WHERE provider = 'openai' AND model = 'gpt-6-luna'
  AND (version, min_input_tokens) IN (
    ('observed-2026-10-21-0', 0),
    ('observed-2026-10-21-272001', 272001)
  );
COMMIT;
```

`20261022013044_admin_transcription_audio_prices.sql` acrescenta a tarifa por token de áudio e os dois contadores de modalidade, com restrição de coerência do total. Mantém RLS, grants e as views existentes. Deve ser revisada/aplicada pelo orquestrador antes da publicação do código que grava as novas colunas. Não recalcula custos históricos.

```sql
-- [Story admin-fase2] C2: file only, pending review/application; no historical events are rewritten.
-- Audio and text input tokens must be measured separately, not charged as all-text input.
-- Official full-model example: https://developers.openai.com/cookbook/examples/realtime_out_of_band_transcription
-- Text rates: https://developers.openai.com/api/docs/pricing ; checked 2026-10-21.
-- Mini audio price stays NULL until verified in an official source (not inferred from estimated USD/min).
BEGIN;
ALTER TABLE public.ai_model_prices ADD COLUMN audio_input_per_million numeric(16,8) CHECK (audio_input_per_million >= 0);
ALTER TABLE public.ai_usage_events ADD COLUMN audio_input_tokens integer CHECK (audio_input_tokens >= 0);
ALTER TABLE public.ai_usage_events ADD COLUMN text_input_tokens integer CHECK (text_input_tokens >= 0);
ALTER TABLE public.ai_usage_events ADD CONSTRAINT ai_usage_input_modalities_check
  CHECK (audio_input_tokens + text_input_tokens = input_tokens);
UPDATE public.ai_model_prices
SET audio_input_per_million = 6,
    source_url = 'https://developers.openai.com/cookbook/examples/realtime_out_of_band_transcription'
WHERE provider = 'openai' AND model = 'gpt-4o-transcribe'
  AND version = 'observed-2026-10-21-0' AND min_input_tokens = 0;
COMMIT;
```

## Gates repetidos

| Gate | Resultado |
| --- | --- |
| `pnpm validate:admin-dados` | Aprovado: 14 grupos unitários, journal best-effort com falha de insert/result, integração LLM, rotas Whisper/Transcribe/Mini/consultor/Deepgram e SQL local. |
| `pnpm typecheck` | 8/8 pacotes aprovados. |
| `pnpm test` | 74 suítes web aprovadas, resultado reproduzido pelo cache Turbo (fontes web sem alteração). |
| `pnpm validate:iap` | JWS 30/30, domínio 56/56, notificações 19/19. |
| `llm.manual.ts` | 31/31, clientes falsos e variáveis sintéticas. |
| `generate-fail-closed.manual.ts` | 43/43, incluindo custo de modelo conhecido e desconhecido na rota real. |
| `livreRouter.manual.ts` | 19/19, incluindo ausência de usage. |
| `pnpm --filter @laudousg/api lint` | Aprovado; aviso preexistente de `<img>` em `app/sala/[token]/page.tsx:1262`. |
| `CI=1 pnpm lint` | Continua bloqueado pela configuração interativa ausente do ESLint no Lab. Não foi alterada a configuração dele. |

O teste SQL usa PostgreSQL embutido descartável. Valida as duas correções Luna, preço de áudio, paridade do catálogo, restrição das modalidades, ACLs/RLS e as views no fuso de São Paulo. Não houve teste real de compra nem chamada de IA/Deepgram nesta rodada.

## Commits locais

`28d327f7` — B1, diário Apple best-effort. `6380a92b` — B2, custo da auditoria restaurado. `3db28403` — C5, usage opcional. `c9aee0d9` — C3, seed e UPDATE Luna. `0a9e3b1a` — C2, separação áudio/texto e nova migração.

B1 e B2 estão corrigidos e testados. A pendência explícita é confirmar a tarifa oficial de áudio do Mini; o comportamento atual é custo nulo para esse consumo, sem atribuir a tarifa de texto ao áudio. As duas migrações novas não foram aplicadas.
