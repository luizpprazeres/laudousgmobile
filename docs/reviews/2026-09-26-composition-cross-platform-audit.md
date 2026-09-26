# Auditoria de compatibilidade — composição clínica (Web) × iOS, Android e Sala

Data: 26/09/2026. QA **somente leitura**: nenhum código, banco ou configuração alterado. Leitura do código local (worktree com mudanças não commitadas das frentes Atlas/Sol/Root) e do repo iOS `~/laudousg-swift/LaudoUSG` (`dc10b70`). Não executei apps, builds nem chamadas de rede. READMEs lidos: raiz do monorepo e `~/laudousg-swift/README.md`.

## Resposta curta para o Root

| Pergunta | Resposta | Evidência |
|---|---|---|
| A Sala atual recebe laudo da Web? | **Não.** A Sala lê só a tabela `reports` (pipeline de IA). `web_reports` nunca é consultada. | `apps/api/src/app/api/sala/latest/route.ts` (`.from("reports").select("id, final_output, generated_output, category_code, …")`), `apps/api/src/app/api/sala/report/route.ts:50`, `apps/api/src/app/api/sala/push/route.ts:38,52` |
| iOS lista `web_reports`? | **Não.** Tabelas usadas: `reports`, `profiles`, `companion_sessions`, `companion_events`, `user_feedback`, `writing_styles`. | `Services/HistoryService.swift` (`/rest/v1/reports`, `select=id,category_code,status,generated_output,final_output,raw_input,created_at,updated_at`) |
| Android lista `web_reports`? | **Não.** Só `reports`, `profiles`, `companion_*`, `user_feedback`. | `apps/mobile/src/lib/api.ts:299` (`from("reports")`), `apps/mobile/src/features/companion/companion.ts` |
| Algum código de `apps/api` lê `web_reports`? | **Não.** Só a Web (`apps/web`) e migrations. | busca em `apps/api/src/app/api` e `apps/api/src/server` sem ocorrência |
| Quem lê `web_reports`? | Web: `lib/webReports.ts`, `app/app/historico/page.tsx`, `app/app/analytics/page.tsx`, `app/api/web-reports/[id]/route.ts` (novo), `LaudarWebExperience.tsx`. | — |

**Consequência:** um laudo composto (ou qualquer laudo da Web) **não aparece** no histórico do iOS, no do Android nem na Sala. Isso não é regressão da composição: `web_reports` sempre foi "gaveta própria, separada de `reports`" (`packages/db/src/sql/0018_web_reports.sql`, comentário de cabeçalho). É um limite de disponibilidade que precisa ficar explícito em qualquer comunicação ao usuário.

## Caminhos reais de histórico e Sala

- **Histórico iOS:** `HistoryService` → Supabase REST `reports`, com filtro opcional `category_code=in.(…)`. Detalhe e edição via `/api/reports/[id]`.
- **Histórico Android:** `apps/mobile/src/lib/api.ts` → Supabase `reports` (leitura e `updateReportFinalOutput`) e `/api/reports/${id}`.
- **Sala (auxiliar/computador):** rotas públicas `/api/sala/latest?token=` e `/api/sala/report` resolvem `room_tokens` (pairing code) → `reports` do médico. Push (`/api/sala/push`, `/api/sala/push-schema`) só atua sobre `reports`.
- **Companion (celular → Web):** o celular grava em `companion_events` (`kind` `text`, `transcript`, `structured_findings`), e a Web lê em `apps/web/src/lib/companion.ts`. O sentido é celular → Web. **Não há canal Web → celular** para laudo.
- **Histórico Web:** une `reports` e `web_reports` por origem (`app/app/historico/page.tsx:20-44`).

## O que o contrato aditivo preserva × o que não disponibiliza

### Preserva (consumidores legados)

1. **Nada muda em `reports`, nas rotas `/api/reports`, `/api/generate`, `/api/sala/*` nem em `/api/categories`.** O diff não toca esses arquivos. iOS e Android continuam lendo exatamente o mesmo que antes.
2. **`packages/shared/src/schemas/index.ts`** só ganhou `export * from "./clinicalComposition"`. É aditivo e não altera schemas existentes consumidos pelo Android.
3. **`web_reports` sem migração.** O envelope vai em `exam_state jsonb`, que já existia. Laudos avulsos antigos continuam `{ kind: 'legacy' }` e só texto (`envelope.ts: parseEnvelope`).
4. **Versão desconhecida não é reinterpretada:** `envelopeVersion`/`contractVersion` diferentes resultam em `composition-unsupported` e em 422 na reabertura; o texto salvo continua no histórico.
5. **Rotas novas isoladas:** `apps/api/src/app/api/compositions/render` (API) e `apps/web/src/app/api/compositions/render` e `apps/web/src/app/api/web-reports/[id]` (Web). Nenhum app móvel as chama.

### Não disponibiliza (recurso Web novo, sem paridade)

1. **iOS e Android não compõem, não listam e não reabrem composições.** Não há código móvel para `clinical-composition/v1`. **Não há paridade móvel nova.**
2. **Sala não exibe laudo da Web**, composto ou avulso.
3. **Companion não transporta laudo Web para o celular.**
4. **Associações suportadas:** o envelope aceita só `ABDOMEN_TOTAL`, `PROSTATA_SUPRAPUBICA`, `MAMARIA` e `PELVE_FEMININA`, sempre com exatamente 2 componentes (`envelope.ts`, `clinicalComposition.ts: components.length(2)`).

## Achados de QA (por severidade)

### A1 — Médio: a categoria composta aparece como código cru nas estatísticas da Web (não reproduzido em navegador)
- **Onde:** `saveCompositionReport` grava `category_code = associationCode` (ex.: `ABDOMEN_TOTAL__PROSTATA_SUPRAPUBICA`) em `web_reports` (`lib/webReports.ts`). O PATCH faz o mesmo. `app/app/analytics/page.tsx:47,84` lê `web_reports.category_code` e passa por `canonicalCategory` (`components/analytics/types.ts:25`), que só mapeia `MUSCULOESQUELETICO_V2`. Não há rótulo em `CATEGORY_LABELS` para o código composto.
- **Efeito provável:** nas estatísticas, a composição conta como uma categoria à parte, com o código cru, e **não soma** em Abdome total nem em Próstata. O **histórico** já trata o código: `HistoryItem.ts` (`categoriaLabel`) ganhou rótulos para `ABDOMEN_TOTAL__PROSTATA_SUPRAPUBICA` e `MAMARIA__PELVE_FEMININA`, e `historico/page.tsx` marca `reopenable` via `parseEnvelope`. **Só a página de estatísticas fica sem tratamento.**
- **Reprodução:** salvar uma composição Abdome + Próstata na Web e abrir `/app/analytics`.
- **Owner:** encaminhado ao **Atlas** (persistência/estatísticas) em 26/09. Decisão: rótulo próprio ou contagem por componente. Status: aberto.

### A2 — Baixo: nenhum código móvel filtra `category_code` desconhecido
- `web_reports` é invisível ao mobile, então **hoje não há efeito**. Se um dia `reports` receber códigos compostos, o filtro `category_code=in.(…)` do iOS (`HistoryService.swift:19`) e o mapeamento de categoria dos dois apps precisam aceitá-los. Registro como condição para qualquer migração futura de `web_reports` → `reports`.

### A3 — Informativo: concorrência de edição está correta no código lido
- O PATCH (`app/api/web-reports/[id]/route.ts`) exige `expectedUpdatedAt` e grava com `.eq('updated_at', expectedUpdatedAt)`. Sem linha atualizada, devolve 409. Confere dono (`user_id`), envelope válido e o mesmo `compositionId` do salvo (409 se trocar). **Não reproduzi em execução.**
- **Nota de risco (não bug comprovado):** o controle depende de o texto do `updated_at` voltar idêntico ao que o PostgREST entregou. Não há teste que prove duas abas concorrentes. Sugiro um teste de integração (duas gravações com o mesmo `expectedUpdatedAt` devem dar 200 e depois 409).
- **Status:** aguardando evidência de execução do Prumo; este item será atualizado quando ela chegar. Até lá, a concorrência está conferida só por leitura de código.

### A4 — Informativo: primeira gravação é INSERT direto do navegador
- `saveCompositionReport` insere via Supabase client com RLS (`web_reports_insert_own`). O envelope é validado por `buildEnvelope` → `CompositionEnvelopeV1Schema.parse` no cliente, mas **o INSERT não passa pela rota que valida no servidor**. Uma escrita manual pela API REST poderia gravar `exam_state` inválido. O efeito fica contido: a reabertura trata como `composition-unsupported` (422). Não é perda clínica, mas foge da regra da story de validar no servidor. **Owner:** Atlas/Root.

## Pendências desta auditoria
- **A1** encaminhado ao Atlas; aberto.
- **A3** aguarda evidência do Prumo.
- Por decisão da coordenação, **não** será feita revisão adversarial profunda do composer inteiro: Sol mantém testes e API estáveis, o Root validou os invariantes, e o Atlas está endurecendo a persistência.
- Não executei: builds iOS/Android, navegador, rotas HTTP.
- Conferi `HistoryItem.ts` e `historico/page.tsx` (tratam o código composto). Não conferi `ReportDetail.tsx`.
- **Sem paridade móvel nova:** nada nesta entrega disponibiliza composição, `web_reports` ou laudo Web no iOS, no Android ou na Sala.

Frente de auditoria encerrada em 26/09/2026, exceto a atualização de A3.
