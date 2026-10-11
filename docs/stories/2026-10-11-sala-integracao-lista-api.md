# Story 2.12 — API da lista de laudos da Sala

Branch: `feat/sala-integracao-lista`, criado de `feat/haiku-migration`.

O grant novo expira junto com `roomExpiryMs`, sem teto de 12 horas. Grants existentes continuam respeitando a validade já persistida. Snapshot, lista e leitura por ID usam a mesma revalidação do grant e da sala em cada chamada. A validade devolvida considera o menor prazo entre grant e sala.

`GET /api/sala/integration/reports` devolve `expiresAt` e até 200 resumos em ordem crescente de `created_at`, com desempate por ID. Cada resumo contém somente `id`, `createdAt`, `category`, `contentRevision`, `reviewStatus`, `reviewedAt`, `preview` e `reviewSignalsCount`. A prévia usa o texto sanitizado existente e corta em 160 caracteres; a contagem soma destaques e avisos. Nenhum campo de nome ou texto completo é incluído no DTO da lista.

`GET /api/sala/integration/report?id=<uuid>` devolve diretamente o contrato de `serializeIntegrationReport`. ID ausente, inválido, inexistente ou fora do recorte autorizado recebe o mesmo 401 `integration_unavailable` usado para credenciais inválidas. Falhas de consulta recebem 503 com o mesmo corpo. Todas as respostas têm `Cache-Control: no-store`.

A revisão médica continua fail closed: falha de leitura das revisões, revisão diferente do conteúdo ou timestamp inválido deixam o laudo pendente. Os alertas automáticos permanecem independentes da revisão médica.

## Limite do contrato existente

Os laudos não têm `room_id` ou `room_token_id`. O recorte solicitado (`reportBelongsToRoomDay`) verifica proprietário e criação desde `salaDayStart` da consulta, como o snapshot legado. Assim, outra sala de outro médico é isolada, mas duas salas do mesmo médico no mesmo dia compartilham os laudos. Não há isolamento por clínica/sala individual nesse modelo. Nenhuma coluna ou migration foi adicionada.

## Validação local

Comandos:

```sh
pnpm --filter @laudousg/api lint
pnpm --filter @laudousg/api typecheck
for test_file in apps/api/src/server/sala/__tests__/*.manual.ts; do pnpm exec tsx --tsconfig apps/api/tsconfig.json "$test_file" || exit 1; done
git diff --check
```

O harness novo executa os handlers reais de connect, snapshot, reports e report com cliente Supabase real e transporte HTTP simulado, sem rede ou dados clínicos reais. Cobre grant inválido/expirado/revogado, sala ausente/inativa/expirada/revogada, acesso cruzado por dono/dia, grant vinculado a outra sala, ordem e limite, sanitização e corte da prévia, revisão pendente/exata, falhas de consulta e regressão do snapshot.

Lint e typecheck passaram; os cinco harnesses da Sala passaram; diff sem erros. O lint mantém o warning preexistente de `<img>` em `src/app/sala/[token]/page.tsx`.

CodeRabbit NÃO EXECUTADO. Não houve push, deploy ou migration remota. Testes sintéticos não comprovam operação integrada em produção.
