# DET-3 — review adversarial DEX1

Escopo: `bundleLoader.ts`, preferências da conta, CRUD admin de variantes, lookup runtime e migration `0001_smart_maddog.sql`. Leitura apenas.

## Veredito

**PROBLEMA.** O desenho geral está correto, mas há dois bloqueantes antes de considerar DET-3 seguro para produção: preferência inválida para o estilo atual cai silenciosamente no default, e a migration pode quebrar se já foi aplicada fora do journal do Drizzle. Há também fragilidade média no CRUD admin: ele permite validar variante que não tem modelo/tag correspondente no bundle.

## Achados

### 1. PROBLEMA — preferência para variante inexistente no estilo atual é ignorada, não bloqueia

Arquivo: `apps/api/src/server/pipeline/bundleLoader.ts`, linhas 312-318 e 326-333.

O comportamento esperado no briefing era: preferência aponta para `variant_key` que não existe naquele estilo → `BUNDLE_VARIANT_EMPTY`.

O código atual faz outra coisa:

- `accountVariantKey` só vira `chosen` se `modeloVariants.has(accountVariantKey)`.
- Se não existir no estilo atual, ele não escolhe a preferência.
- Depois cai em `selector?.defaultVariant ?? "padrao"`.
- Como o default normalmente existe, não dispara `BUNDLE_VARIANT_EMPTY`.

Isso cria fallback silencioso. Exemplo mental: usuário salva preferência `MAMARIA/enxuta` a partir de `CLASSICO_COMPLETO`, mas faz request em um estilo onde o seed `variant:enxuta` não existe ou foi arquivado. O loader ignora a preferência e gera `padrao`. O médico acha que a preferência está ativa, mas o laudo sai com outra máscara.

Ponto positivo: quando há gatilho positivo de contexto, a preferência não sobrescreve. `contextVariant` é calculado antes e só usa `accountVariantKey` se `chosen === null`, então o caso MORFOLOGICO com "primeiro trimestre" + preferência `2t` fica correto.

### 2. PROBLEMA — migration não é idempotente se foi aplicada via MCP fora do journal Drizzle

Arquivo: `packages/db/drizzle/0001_smart_maddog.sql`, linhas 6 e 24.  
Arquivo: `packages/db/src/migrate.ts`, linhas 17-19.

O doc diz que a migration foi aplicada via MCP `apply_migration`. O `migrate()` do package roda o migrator Drizzle em `packages/db/drizzle`. Se o MCP não gravou a entrada correspondente no journal/tabela de migrations do Drizzle, um deploy futuro com `migrate()` tentará rodar `0001_smart_maddog.sql` de novo.

Como o SQL usa `CREATE TABLE "report_template_variants"` e `CREATE TABLE "account_report_preferences"` sem `IF NOT EXISTS`, isso quebra com `relation already exists`.

Esse risco é independente do conteúdo estar correto. A migration contém só as duas tabelas, FKs, índices e RLS relevantes, e não recria `subscriptions`/`product_events`. O problema é o mecanismo de aplicação: migration manual fora do journal + SQL não idempotente.

### 3. PROBLEMA MÉDIO — CRUD admin permite variante validated sem modelo `variant:` correspondente

Arquivo: `apps/api/src/app/api/admin/report-template-variants/route.ts`, linhas 77-91.  
Arquivo: `apps/api/src/app/api/admin/report-template-variants/[id]/route.ts`, linhas 35-56.

O POST valida só shape via Zod e depende de FK para categoria/estilo existirem. O PATCH permite mudar `variant_key` e `status` para `validated` sem checar se existe `knowledge_blocks.kind='modelo'`, `status='validated'`, mesma categoria/estilo e tag `variant:<variant_key>`.

Resultado: admin consegue criar ou promover catálogo que aparece para o usuário e pode ser salvo em preferência, mas não tem modelo correspondente. No runtime, isso vira:

- com o bug do achado 1: fallback silencioso se a key não existir no estilo atual;
- se achado 1 for corrigido: `BUNDLE_VARIANT_EMPTY`.

O catálogo deveria refletir o bundle real enquanto `template_body` ainda não é fonte primária. Hoje ele pode mentir.

### 4. OK — GET/PATCH de preferências não permitem mexer em outro usuário

Arquivo: `apps/api/src/app/api/me/report-preferences/route.ts`, linhas 28-42 e 101-114.

Mesmo usando service-role no backend, GET filtra `accountReportPreferences.userId = user.id`, e PATCH grava `userId: user.id` no insert/upsert. O cliente não envia `user_id`. Isso está correto.

A validação do PATCH também exige categoria existente e variante `validated` da mesma categoria, linhas 77-99. Não valida `writing_style_id`, mas isso parece intencional no desenho: a preferência salva um `default_variant_id`, o runtime extrai só `variant_key` e aplica ao estilo da request.

### 5. OK COM RESSALVA — `resolveAccountVariantKey` filtra `validated`, mas não prova compatibilidade com o estilo atual

Arquivo: `apps/api/src/server/db/lookups.ts`, linhas 76-94.

O JOIN filtra `reportTemplateVariants.status = 'validated'` e retorna `variant_key`, como esperado.

A ressalva é a mesma raiz dos achados 1 e 3: a função não recebe `writing_style_id`, então não sabe se a key existe no estilo da request. Isso é aceitável se o loader bloquear quando a preferência não existir naquele estilo. Hoje ele não bloqueia, cai no default.

## Respostas aos casos pedidos

1a. Categoria com seletor + preferência + gatilho positivo: **OK.** Contexto vence porque `accountVariantKey` só entra quando `contextVariant === null`.

1b. Categoria com seletor + ditado sem gatilho + preferência: **OK se a variante existir no estilo.** A preferência entra por `modeloVariants.has(accountVariantKey)`.

1c. Preferência aponta para key que não existe naquele estilo: **PROBLEMA.** Não dá `BUNDLE_VARIANT_EMPTY`; cai no default silenciosamente.

1d. Categoria de 1 modelo sem `variant:` + preferência setada por engano: **OK.** `modeloVariants.size === 0` retorna rows direto e o gate de exatamente 1 modelo resolve.

2. Rotas `/api/me/report-preferences`: **OK para RLS lógico por user.id.** PATCH só mexe no próprio usuário e valida categoria/variante/status.

3. Admin variants: **parcial.** `requireAdmin` está correto, mas falta validar que uma variante `validated` corresponde a um modelo real/tag real no bundle.

4. Migration: **conteúdo está focado nas 2 tabelas, mas aplicação é frágil.** Se já foi aplicada fora do journal Drizzle, `migrate()` pode quebrar por `CREATE TABLE` sem `IF NOT EXISTS`.

## Recomendação objetiva

Antes de liberar:

1. No `bundleLoader`, se `accountVariantKey` veio e não há `contextVariant`, escolher essa key mesmo que não exista em `modeloVariants`; deixar o `hasChosenModelo` disparar `BUNDLE_VARIANT_EMPTY`.
2. No admin POST/PATCH, ao criar/promover `status='validated'`, checar modelo validated correspondente com tag `variant:<key>` para a mesma categoria/estilo, enquanto DET-5 não usa `template_body` como fonte.
3. Garantir que `0001_smart_maddog` esteja registrado no journal Drizzle em prod, ou tornar a migration idempotente/usar caminho único de aplicação. Do jeito atual, aplicar via MCP e depois rodar `migrate()` é um risco real.

REVIEW DET-3 DEX1 PRONTO
