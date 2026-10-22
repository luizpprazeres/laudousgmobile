# E4 + E5 servidor — entrega de 22/10/2026

Pronto para revisão local na branch `feat/admin-e4e5`, no worktree `~/.worktrees/laudousg-admin-e4e5`, criado de `origin/main` em `87c56b5d`. Escopo: [briefing E4/E5](/Users/luizprazeres/laudousgmobile-def/docs/admin/briefing-e4-e5-servidor-2026-10-22.md). Não houve push, deploy, alteração de env na Vercel ou aplicação de migração no projeto Supabase. O SQL foi executado somente em Postgres embarcado e descartável (PGlite), sem conexão com produção.

Commits de implementação: `a500a1a8` (entrada da landing e contador) e `1e559067` (Apple diária, fontes do painel e testes). Este documento é um commit separado de entrega.

## E5: contrato com a landing

`POST /admin/api/collect` lê até 1.024 bytes do corpo como texto e faz `JSON.parse`, aceitando o `text/plain;charset=UTF-8` enviado pelo `sendBeacon`. Não exige `application/json`, não abre sessão e sempre devolve 204 sem corpo. Valida `Origin` ou, na ausência dele, `Referer` contra `ADMIN_PUBLIC_ORIGIN`. Descarta bots e caminhos fora da allowlist; UTM inválida vira vazia. O referrer vira apenas host; caminhos, query e IP literal são descartados.

`GET /admin/api/baixar?src=…` responde 302 para a URL fixa da loja, com `ct=landing-<src>&mt=8`. Os valores `nav`, `hero`, `precos`, `final`, `dialogo` e `qr` estão cobertos no teste. Qualquer outro valor que respeite o contrato também é aceito; inválido vira `outro`. `pt` só entra quando `APPLE_CAMPAIGN_PT` contém o identificador numérico. A gravação fica em `after()`, com prazo de 3 segundos, sem bloquear o redirecionamento; falhas só registram um código fixo.

Aparelho é deduzido no servidor. IP é usado exclusivamente no limitador em memória: 120 eventos/minuto por IP, mapa com até 5.000 entradas. Nunca chega ao banco ou aos logs. Esse limite é local a cada instância da função, não um limite global distribuído. Não há cookie, identificador de visitante, User-Agent completo ou corpo bruto persistido. Contagens são eventos, não pessoas únicas; gravação é best-effort, não promessa de contagem exata.

A migração `20261022173915_admin_landing_daily.sql` cria a tabela com dia de São Paulo, PK composta, RLS sem policies e função `landing_increment` com `SECURITY INVOKER` e execução exclusiva do `service_role`. Incremento usa `ON CONFLICT … count + 1` no próprio banco.

O rewrite de `/baixar` e a emissão dos beacons são de ownership do LAND; não foram alterados nesta branch. A origem aceita continua exatamente a do briefing: `https://app.laudousg.com.br`.

## E4: coleta diária da Apple

`GET /admin/api/cron/apple` exige o Bearer exato de `CRON_SECRET`; segredo ausente, Bearer errado ou sessão sem Bearer recebem 404. As três rotas de ingestão passam pelo middleware antes de qualquer leitura de configuração de login ou renovação de sessão.

Cron configurado em `apps/admin/vercel.json`: `15 */3 * * *`, caminho `/admin/api/cron/apple`. Prazo do job: 50 segundos; função: 60 segundos. HTTP tem timeout de até 8 segundos, RPC de até 4 segundos, corpo compactado/descompactado limitado e paginação validada. O processamento retoma pelos registros ainda não concluídos; 404 de arquivo/segmento significa pendente e volta a ser tentado. Nunca vira zero artificial. Erros são códigos fixos; respostas brutas, JWT e URLs assinadas não são gravados nem registrados.

SALES, SUBSCRIPTION e SUBSCRIPTION_EVENT buscam os dias faltantes desde 21/10/2026 até o dia anterior. Não buscam SUBSCRIBER. Guardam somente agregados por produto, tipo/evento, país, aparelho e versão quando pertinentes. Proceeds de Sales são o valor por unidade multiplicado pelas unidades e ficam separados por moeda. Nomes, SKU, estado/endereço, datas de início da assinatura, referrers livres e identificadores de assinantes são descartados. Eventos de assinatura usam vocabulário fixo documentado; evento desconhecido vira `Other`.

Analytics lê o pedido ONGOING já existente, sem criar pedido novo. Guarda Discovery and Engagement Standard, Downloads Standard, Sessions Standard e App Crashes (este último não tem variante Detailed no esquema documentado). Lê todas as páginas e todos os segmentos da instância DAILY. URLs temporárias são usadas imediatamente, sem encaminhar o JWT; HTTPS, host Apple/AWS, tamanho e MD5 são verificados. Falha em qualquer segmento impede a gravação parcial da instância.

A migração `20261022173940_admin_apple_daily.sql` cria as quatro tabelas de agregados e `apple_fetch_log`. Todas têm RLS sem policies e nenhum grant para PUBLIC, anon ou authenticated. A função `apple_store_batch` usa `SECURITY INVOKER`, execução exclusiva do `service_role`, trava transacional e substituição/gravação do lote junto com o registro de sucesso. Em Analytics, uma `processingDate` mais recente substitui a partição inteira do mesmo relatório/Date; não soma snapshots sobrepostos. Uma execução antiga atrasada não sobrescreve uma partição mais nova. A coleta prioriza Analytics, cujas instâncias expiram após 35 dias.

O dia de Sales/Analytics é o dia informado pela Apple, preservado sem conversão arbitrária para Brasília. O dia da landing é São Paulo. Analytics depende de consentimento, limiar de privacidade e prazos de completude; a tela informa que ausência de linha não significa zero. Instâncias ainda preliminares podem ser substituídas pela publicação seguinte.

## Painel

Funil e Visão geral passam a consumir `landing_daily` e `apple_sales_daily` por allowlist de colunas. Mostram primeiras instalações e reinstalações por dia, com “—” nos dias pendentes. Os totais de 7/30 dias de Sales consideram até ontem e ficam indisponíveis se faltar relatório no intervalo desde a publicação do app. O mesmo cuidado vale para dias omitidos em visualizações da Analytics: não se soma zero implicitamente para preencher a lacuna. Analytics alimenta visualizações de produto e origem de primeiras instalações, usando suas próprias contagens, sem multiplicar proporções por um total de Sales de outra fonte.

O Funil inclui visitas, aberturas do QR e cliques por `src`. Assinaturas mostra a foto diária de pagos/testes/carência/billing retry da Apple ao lado do estado atual do webhook e do total de eventos do dia, explicando que horários e escopos diferem. Tabelas vazias ou ainda indisponíveis preservam os exemplos identificados. TestFlight continua aguardando a chave App Manager, por decisão do briefing.

## Evidência de validação

| Verificação | Resultado |
| --- | --- |
| `pnpm --filter @laudousg/admin typecheck` | Passou. |
| `ADMIN_MIGRATIONS_DIR="$PWD/supabase/migrations" pnpm --filter @laudousg/admin test` | 45 testes passaram, nenhum ignorado. Inclui auditoria de colunas/views sem texto clínico. |
| `pnpm --filter @laudousg/admin build` | Passou; rotas collect, baixar e cron presentes no build. |
| Parsers | Sete arquivos TSV sintéticos: Sales, Subscription, Subscription Event e quatro Analytics. |
| SQL local | Duas migrações executadas em PGlite descartável. RLS, ausência de policies, grants, incremento, idempotência e substituição de partição conferidos. |
| Cron repetido | Duas execuções usando SQL real local: nenhum agregado duplicado; 404 continua pendente e é buscado novamente. |
| Analytics adversarial | Segmento faltante não grava parcial; snapshot novo remove dimensão antiga; worker antigo não sobrescreve novo. HTTP cobre paginação, MD5/gzip, ausência de JWT no download e rejeição de URL externa/tamanho excessivo. |
| Privacidade landing | Teste inspeciona o objeto enviado para gravação; campos extras, cookie, IP e User-Agent não entram nele. |
| Smoke HTTP local | `next start` em porta própria, sem credenciais de banco: baixar 302 com campanha hero; collect text/plain 204; cron sem Bearer 404. Sem `Set-Cookie` nas três respostas. Processo encerrado. |
| Gates gerais pedidos pelo AGENTS | `npm run typecheck`: 9 tarefas passaram (8 em cache). `npm test`: 2 tarefas passaram (1 em cache). |
| `npm run lint` global | Bloqueado pelo `next lint` do Lab pedindo configuração interativa do ESLint, já presente na base; nenhuma configuração alheia foi alterada. Build do admin passou. |
| Apple real | **Smoke autenticado não executado nesta rodada.** Não há issuer ID nas variáveis locais disponíveis nem no `.env` principal consultado. Nenhum GET foi apresentado como teste real; nenhum POST foi feito. Os 200/403 descritos no briefing são evidência do orquestrador, não desta execução. |
| Revisão externa | CodeRabbit NÃO EXECUTADO. |

## Documentação oficial conferida em 22/10/2026

As combinações vigentes são SALES/SUMMARY/DAILY `1_0`, SUBSCRIPTION/SUMMARY/DAILY `1_3` e SUBSCRIPTION_EVENT/SUMMARY/DAILY `1_3`, conforme [GET salesReports](https://developer.apple.com/documentation/appstoreconnectapi/get-v1-salesreports). Campos de [Summary Sales](https://developer.apple.com/help/app-store-connect/reference/reporting/summary-sales-report/), [Subscription](https://developer.apple.com/help/app-store-connect/reference/reporting/subscription-report/), [Subscription Event](https://developer.apple.com/help/app-store-connect/reference/reporting/subscription-event-report/) e [vocabulário de eventos](https://developer.apple.com/help/app-store-connect/reference/reporting/subscription-events/) fundamentam os parsers.

O formato gzip/tabulado, paginação e download dos segmentos foram conferidos em [Downloading Analytics Reports](https://developer.apple.com/documentation/appstoreconnectapi/downloading-analytics-reports), e o MD5 em [AnalyticsReportSegment.Attributes](https://developer.apple.com/documentation/appstoreconnectapi/analyticsreportsegment/attributes-data.dictionary). A regra de substituir, sem somar, instâncias de datas de processamento distintas vem de [Data Completeness and Corrections](https://developer.apple.com/documentation/analytics-reports/data-completeness-corrections).

Os campos dos quatro relatórios estão em [Discovery and Engagement](https://developer.apple.com/documentation/analytics-reports/app-store-discovery-and-engagement), [Downloads](https://developer.apple.com/documentation/analytics-reports/app-download), [Sessions](https://developer.apple.com/documentation/analytics-reports/app-sessions) e [Crashes](https://developer.apple.com/documentation/analytics-reports/app-crashes). O tratamento de ausência e privacidade segue [Protecting user privacy in report data](https://developer.apple.com/documentation/analytics-reports/privacy).

## Checklist de escopo e arquivos

| Critério | Estado |
| --- | --- |
| Worktree novo de origin/main e commits `[Story admin-fase2]` | Concluído localmente. |
| Contrato LAND preservado, inclusive text/plain e seis src informados | Concluído e testado. |
| Migrações somente em arquivo; nenhum acesso de escrita remoto | Cumprido. |
| Cron autenticado, orçamento, retry, agregação e persistência idempotente | Implementado e testado localmente. |
| Tela usa fonte real quando disponível e distingue pendente de zero | Implementado e testado na agregação. |
| Validação contra arquivos reais publicados pela Apple | Pendente para o primeiro smoke autenticado do orquestrador. |

| Grupo | Arquivos |
| --- | --- |
| Landing | `apps/admin/src/lib/landing/{validar,limite,servidor,rotas}.ts`; `src/app/api/{collect,baixar}/route.ts`; `src/lib/auth/acesso.ts`; `src/middleware.ts`. |
| Apple | `apps/admin/src/lib/asc/diario-{parser,eventos,http,job,servidor}.ts`; `src/lib/asc/relatorios.ts`; `src/app/api/cron/apple/route.ts`. |
| Painel | `apps/admin/src/lib/data/{fonte-diaria,colunas,tipos,painel}.ts`; `src/components/DiasApple.tsx`; páginas `src/app/(painel)/{page.tsx,funil/page.tsx,assinaturas/page.tsx}`. |
| Infra somente em arquivo | Duas migrações indicadas acima; `apps/admin/vercel.json`; `apps/admin/.env.example`. |
| Testes | `apps/admin/tests/{landing,apple-diario}.test.ts`; `tests/fixtures/apple/{sales,subscription,subscription-event,downloads,discovery,sessions,crashes}.tsv`. |
| Entrega | `docs/admin/entrega-e4-e5-servidor.md`. |

Para publicação, o orquestrador ainda precisa revisar/aplicar as duas migrações, conferir a exposição no Data API e os grants exclusivamente de serviço, configurar `CRON_SECRET` no projeto admin e fazer o primeiro GET autenticado. Nenhuma dessas ações remotas foi executada por esta frente. `APPLE_CAMPAIGN_PT` permanece opcional e vazio até o Luiz obtê-lo no ASC.
