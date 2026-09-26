# QA dos handlers reais de composição — 26/09/2026

Escopo: `apps/web/src/app/api/web-reports/[id]/route.ts` (GET/PATCH), `apps/web/src/app/api/compositions/render/route.ts` (POST) e, para o limite de corpo, `apps/api/src/app/api/compositions/render/route.ts` (POST). Nenhum banco remoto foi usado. O teste importa os handlers reais em bundles esbuild; substitui apenas Supabase por linhas em memória, a autorização de serviço e o renderer no caso do limite. O caminho do proxy usa o `comporNoServico` real e entrega a chamada ao handler real da API.

Teste: `cd apps/web && node --import tsx tests/compositionRoutes.route.manual.ts`

Resultado após as duas correções de Atlas: **21 passaram, 0 falharam**. `pnpm exec tsc --noEmit` também passou. A asserção adversarial `A1B` foi preservada; agora recebe 400 no PATCH, sem update. GET de linha com iniciais cruas recebe 422.

## Correção principal verificada

`apps/web/src/app/api/web-reports/[id]/route.ts:51-59,78-84`: GET agora recusa reabrir texto divergente (422) e PATCH recusa `laudoText` que contradiz o rascunho/apresentação do envelope (400). O caso original `LAUDO ORIGINAL` versus `TEXTO DIFERENTE` passou, assim como iniciais normais derivadas do envelope.

## Lacuna de iniciais corrigida e revalidada

`apps/web/src/lib/composition/envelope.ts:82` agora aceita somente iniciais normalizadas (`/^[a-z]{0,4}$/`). A entrada adversarial `initials: "A1B"`, `laudoText: "LAUDO ORIGINAL\n\n/ab"` e apresentação HTML terminada em `/A1B` recebe **400**, sem update. A mesma forma crua numa linha salva não reabre: **422** no GET. Iniciais normalizadas (`ab`) continuam aceitas.

## Cobertura que passou

GET: 401 sem sessão; 404 para UUID inválido e laudo de outro usuário; 422 para legado, versão desconhecida, envelope incompleto, texto salvo divergente e iniciais cruas; 200 com envelope, texto e timestamp do dono; resposta JSON e sanitização da apresentação no consumidor.

PATCH: 401/404 sem update; 400 para versão inválida, revisão renderizada adulterada, título >200, texto >100.000, divergência texto/envelope, iniciais faltantes e iniciais cruas; 409 para outro `compositionId` e `expectedUpdatedAt` obsoleto, sem alteração da linha; update válido com filtros simultâneos `id`, `user_id` e `updated_at`, incluindo `category_code` da associação.

Proxy: 401 sem sessão; 400 para JSON/schema/versão inválidos e `writingStyle` enviado pelo navegador; estilo `OBJETIVO` injetado a partir do perfil; 503 sem URL do serviço; propagação de 413/corpo; corpo acima de 256 KiB recusado pelo handler real da API após encaminhamento do proxy.

## Limite da evidência

O mock verifica que as consultas do handler incluem `user_id` e que o filtro impede leitura/update de outro usuário. Não prova políticas RLS ou persistência real no Supabase. O teste HTML chama `extractReportPresentation` e `textToReportHtml` reais; não é um teste visual de navegador. Os dois defeitos foram revalidados no handler real com mock apenas no banco.
